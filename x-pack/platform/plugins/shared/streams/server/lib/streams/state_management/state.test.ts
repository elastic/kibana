/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { State } from './state';
import { GroupStream } from './streams/group_stream';
import { UnwiredStream } from './streams/unwired_stream';
import { WiredStream } from './streams/wired_stream';
import * as streamFromDefinition from './stream_active_record/stream_from_definition';
import {
  StreamActiveRecord,
  StreamChangeStatus,
  ValidationResult,
} from './stream_active_record/stream_active_record';
import { StreamChange } from './types';
import { ElasticsearchAction } from './execution_plan/types';
import { ExecutionPlan } from './execution_plan/execution_plan';
import { Streams } from '@kbn/streams-schema';
import { LockManagerService } from '@kbn/lock-manager';

describe('State', () => {
  const searchMock = jest.fn();
  const storageClientMock = {
    search: searchMock,
  };
  const stateDependenciesMock = {
    storageClient: storageClientMock,
    lockManager: {
      withLock: (_, cb) => cb(),
    } as LockManagerService,
    isDev: true,
  } as any;

  it('loads the state and initializes the correct Stream class instances', async () => {
    const wiredStream: Streams.WiredStream.Definition = {
      name: 'wired_stream',
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        processing: [],
        wired: {
          fields: {},
          routing: [],
        },
      },
    };
    const unwiredStream: Streams.UnwiredStream.Definition = {
      name: 'unwired_stream',
      description: '',
      ingest: {
        lifecycle: { inherit: {} },
        processing: [],
        unwired: {},
      },
    };
    const groupStream: Streams.GroupStream.Definition = {
      name: 'group_stream',
      description: '',
      group: {
        members: [],
      },
    };

    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [{ _source: wiredStream }, { _source: unwiredStream }, { _source: groupStream }],
        total: { value: 3 },
      },
    }));

    const currentState = await State.currentState(stateDependenciesMock);

    expect(currentState.all().length).toEqual(3);
    expect(currentState.get('wired_stream') instanceof WiredStream).toEqual(true);
    expect(currentState.get('unwired_stream') instanceof UnwiredStream).toEqual(true);
    expect(currentState.get('group_stream') instanceof GroupStream).toEqual(true);

    const clonedState = currentState.clone();
    expect(clonedState.toPrintable()).toEqual(currentState.toPrintable());
  });

  it('fails to load if an unsupported stream type is stored', async () => {
    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [{ _source: { name: 'test_stream', unknown: {} } }],
        total: { value: 3 },
      },
    }));

    await expect(async () => await State.currentState(stateDependenciesMock)).rejects.toThrowError(
      'Failed to load current Streams state: Unsupported stream type'
    );
  });

  it('does not allow modifying the starting state', async () => {
    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [
          { _source: { name: 'test_stream', unknown: {} } },
          { _source: { name: 'other_test_stream', unknown: {} } },
        ],
        total: { value: 2 },
      },
    }));

    jest
      .spyOn(streamFromDefinition, 'streamFromDefinition')
      .mockImplementation((definition) =>
        streamThatModifiesStartingState(definition.name, stateDependenciesMock)
      );

    await expect(
      async () =>
        await State.attemptChanges(
          [
            {
              type: 'upsert',
              definition: {
                description: '',
                name: 'whatever',
                group: {
                  members: [],
                },
              },
            },
          ],
          stateDependenciesMock
        )
    ).rejects.toThrow('applyChanges resulted in the starting state being modified');
  });

  it('prevents excessive cascading changes', async () => {
    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [{ _source: { name: 'test_stream', unknown: {} } }],
        total: { value: 1 },
      },
    }));

    jest
      .spyOn(streamFromDefinition, 'streamFromDefinition')
      .mockImplementationOnce(() => streamThatCascadesTooMuch(stateDependenciesMock));

    await expect(
      async () =>
        await State.attemptChanges(
          [
            {
              type: 'upsert',
              definition: {
                description: '',
                name: 'new_group_stream',
                group: {
                  members: [],
                },
              },
            },
          ],
          stateDependenciesMock
        )
    ).rejects.toThrow('Excessive cascading changes');
  });

  it('attempt to rollback by restoring the previous stream states', async () => {
    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [{ _source: { name: 'test_stream', unknown: {} } }],
        total: { value: 1 },
      },
    }));

    jest
      .spyOn(streamFromDefinition, 'streamFromDefinition')
      .mockImplementation((definition) => rollbackStream(definition.name, stateDependenciesMock));

    const spy = jest.spyOn(State.prototype, 'determineElasticsearchActions');

    await expect(
      async () =>
        await State.attemptChanges(
          [
            {
              type: 'upsert',
              definition: {
                name: 'new_test_stream',
                description: '',
                group: {
                  members: [],
                },
              },
            },
            {
              type: 'delete',
              name: 'test_stream',
            },
          ],
          stateDependenciesMock
        )
    ).rejects.toThrow('Failed to execute Elasticsearch actions');

    expect(spy).toHaveBeenCalledTimes(2);
    const rollbackTargets = spy.mock.calls[1][0];
    expect(rollbackTargets.map((stream) => stream.toPrintable())).toEqual([
      // Was deleted, becomes re-created during rollback
      {
        changeStatus: 'upserted',
        definition: {
          name: 'test_stream',
        },
      },
      // Was created, becomes deleted during rollback
      {
        changeStatus: 'deleted',
        definition: {
          name: 'new_test_stream',
        },
      },
    ]);
  });

  it('delegates control to StreamActiveRecord and ExecutionPlan', async () => {
    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [{ _source: { name: 'test_stream', unknown: {} } }],
        total: { value: 1 },
      },
    }));

    const FlowStream = flowStream();

    jest
      .spyOn(streamFromDefinition, 'streamFromDefinition')
      .mockImplementation((definition) => new FlowStream(definition, stateDependenciesMock));

    const applyChangeSpy = jest.spyOn(FlowStream.prototype, 'applyChange');
    const validateSpy = jest.spyOn(FlowStream.prototype, 'validate');
    const determineElasticsearchActionsSpy = jest.spyOn(
      FlowStream.prototype,
      'determineElasticsearchActions'
    );
    const planSpy = jest.spyOn(ExecutionPlan.prototype, 'plan').mockImplementation(async () => {
      // Do nothing
    });
    const executeSpy = jest
      .spyOn(ExecutionPlan.prototype, 'execute')
      .mockImplementation(async () => {
        // Do nothing
      });

    await State.attemptChanges(
      [
        {
          type: 'delete',
          name: 'test_stream',
        },
      ],
      stateDependenciesMock
    );

    expect(applyChangeSpy).toBeCalled();
    expect(validateSpy).toBeCalled();
    expect(determineElasticsearchActionsSpy).toBeCalled();
    expect(planSpy).toBeCalled();
    expect(executeSpy).toBeCalled();
  });
});

function streamThatModifiesStartingState(name: string, stateDependenciesMock: any) {
  class StartingStateModifyingStream extends StreamActiveRecord<any> {
    protected async doHandleUpsertChange(
      definition: Streams.all.Definition,
      desiredState: State,
      startingState: State
    ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
      if (this.definition.name === 'test_stream') {
        startingState.get('other_test_stream')?.markAsDeleted();
      }
      return { cascadingChanges: [], changeStatus: 'unchanged' };
    }

    clone(): StreamActiveRecord<Streams.all.Definition> {
      return new StartingStateModifyingStream(this.definition, this.dependencies);
    }
    protected async doHandleDeleteChange(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doValidateUpsertion(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doValidateDeletion(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doDetermineCreateActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doDetermineUpdateActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doDetermineDeleteActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
  }

  return new StartingStateModifyingStream(
    {
      name,
    },
    stateDependenciesMock
  );
}

function streamThatCascadesTooMuch(stateDependenciesMock: any) {
  class CascadingStream extends StreamActiveRecord<any> {
    protected async doHandleUpsertChange(
      definition: Streams.all.Definition,
      desiredState: State,
      startingState: State
    ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
      return {
        cascadingChanges: [
          {
            type: 'upsert',
            definition: {
              name: 'and_another',
              description: '',
              group: {
                members: [],
              },
            },
          },
        ],
        changeStatus: 'unchanged',
      };
    }

    clone(): StreamActiveRecord<Streams.all.Definition> {
      return new CascadingStream(this.definition, this.dependencies);
    }
    protected async doHandleDeleteChange(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doValidateUpsertion(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doValidateDeletion(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doDetermineCreateActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doDetermineUpdateActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    protected async doDetermineDeleteActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
  }

  return new CascadingStream(
    {
      name: 'bad_stream',
    },
    stateDependenciesMock
  );
}

function rollbackStream(name: string, stateDependenciesMock: any) {
  class SimpleStream extends StreamActiveRecord<any> {
    protected async doHandleUpsertChange(
      definition: Streams.all.Definition
    ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
      return {
        cascadingChanges: [],
        changeStatus: definition.name === this.definition.name ? 'upserted' : this.changeStatus,
      };
    }
    protected async doHandleDeleteChange(target: string): Promise<any> {
      return {
        cascadingChanges: [],
        changeStatus: target === this.definition.name ? 'deleted' : this.changeStatus,
      };
    }
    protected async doValidateUpsertion(): Promise<ValidationResult> {
      return { isValid: true, errors: [] };
    }
    protected async doValidateDeletion(): Promise<ValidationResult> {
      return { isValid: true, errors: [] };
    }
    protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
      return [
        {
          type: 'upsert_dot_streams_document',
          request: this.definition,
        },
      ];
    }
    protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
      return [
        {
          type: 'delete_dot_streams_document',
          request: {
            name: this.definition.name,
          },
        },
      ];
    }
    clone(): StreamActiveRecord<Streams.all.Definition> {
      return new SimpleStream(this.definition, this.dependencies);
    }
    protected async doDetermineUpdateActions(): Promise<ElasticsearchAction[]> {
      throw new Error('Not implemented');
    }
  }

  return new SimpleStream(
    {
      name,
    },
    stateDependenciesMock
  );
}

function flowStream() {
  class FlowStream extends StreamActiveRecord<any> {
    protected async doHandleUpsertChange(
      definition: Streams.all.Definition
    ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
      return {
        cascadingChanges: [],
        changeStatus: definition.name === this.definition.name ? 'upserted' : this.changeStatus,
      };
    }
    protected async doHandleDeleteChange(target: string): Promise<any> {
      return {
        cascadingChanges: [],
        changeStatus: target === this.definition.name ? 'upserted' : this.changeStatus,
      };
    }
    protected async doValidateUpsertion(): Promise<ValidationResult> {
      return { isValid: true, errors: [] };
    }
    protected async doValidateDeletion(): Promise<ValidationResult> {
      return { isValid: true, errors: [] };
    }
    protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
      return [];
    }
    protected async doDetermineUpdateActions(): Promise<ElasticsearchAction[]> {
      return [];
    }
    protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
      return [];
    }
    clone(): StreamActiveRecord<Streams.all.Definition> {
      return new FlowStream(this.definition, this.dependencies);
    }
  }

  return FlowStream;
}

// Check that the various flows ends up calling the right stream AR functions?
// As well as calling the right ExecutionPlan methods
