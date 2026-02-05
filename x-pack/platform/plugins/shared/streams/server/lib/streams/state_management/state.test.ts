/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { State } from './state';
import { ClassicStream } from './streams/classic_stream';
import { WiredStream } from './streams/wired_stream';
import * as streamFromDefinition from './stream_active_record/stream_from_definition';
import type {
  StreamChangeStatus,
  ValidationResult,
} from './stream_active_record/stream_active_record';
import { StreamActiveRecord } from './stream_active_record/stream_active_record';
import type { StreamChange } from './types';
import type { ElasticsearchAction } from './execution_plan/types';
import { ExecutionPlan } from './execution_plan/execution_plan';
import type { Streams } from '@kbn/streams-schema';
import type { LockManagerService } from '@kbn/lock-manager';

const placeholderStreamDefinition: Streams.WiredStream.Definition = {
  name: 'placeholder_stream',
  description: 'You know, for testing',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    wired: {
      fields: {},
      routing: [],
    },
    failure_store: { inherit: {} },
  },
};

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it('loads the state and initializes the correct Stream class instances', async () => {
    const wiredStream: Streams.WiredStream.Definition = {
      name: 'wired_stream',
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        wired: {
          fields: {},
          routing: [],
        },
        failure_store: { inherit: {} },
      },
    };
    const classicStream: Streams.ClassicStream.Definition = {
      name: 'classic_stream',
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        classic: {},
        failure_store: { inherit: {} },
      },
    };

    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [{ _source: wiredStream }, { _source: classicStream }],
        total: { value: 2 },
      },
    }));

    const currentState = await State.currentState(stateDependenciesMock);

    expect(currentState.all().length).toEqual(2);
    expect(currentState.get('wired_stream') instanceof WiredStream).toEqual(true);
    expect(currentState.get('classic_stream') instanceof ClassicStream).toEqual(true);

    const clonedState = currentState.clone();
    expect(clonedState.toPrintable()).toEqual(currentState.toPrintable());
  });

  it('fails to load if an unsupported stream type is stored', async () => {
    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [{ _source: { name: 'test_stream', unknown: {} } }],
        total: { value: 1 },
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
              definition: placeholderStreamDefinition,
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
              definition: placeholderStreamDefinition,
            },
          ],
          stateDependenciesMock
        )
    ).rejects.toThrow('Excessive cascading changes');
  });

  it('reports when it fails to make the desired changes', async () => {
    searchMock.mockImplementationOnce(() => ({
      hits: {
        hits: [],
        total: { value: 0 },
      },
    }));

    jest
      .spyOn(streamFromDefinition, 'streamFromDefinition')
      .mockImplementation((definition) => failingStream(stateDependenciesMock));

    await expect(
      async () =>
        await State.attemptChanges(
          [
            {
              type: 'upsert',
              definition: placeholderStreamDefinition,
            },
          ],
          stateDependenciesMock
        )
    ).rejects.toThrow('Failed to change state');
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function streamThatModifiesStartingState(name: string, stateDependenciesMock: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    protected doClone(): StreamActiveRecord<Streams.all.Definition> {
      return new StartingStateModifyingStream(this.definition, this.dependencies);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doHandleDeleteChange(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doValidateUpsertion(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doValidateDeletion(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doDetermineCreateActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doDetermineUpdateActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function streamThatCascadesTooMuch(stateDependenciesMock: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            definition: placeholderStreamDefinition,
          },
        ],
        changeStatus: 'unchanged',
      };
    }

    protected doClone(): StreamActiveRecord<Streams.all.Definition> {
      return new CascadingStream(this.definition, this.dependencies);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doHandleDeleteChange(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doValidateUpsertion(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doValidateDeletion(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doDetermineCreateActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doDetermineUpdateActions(): Promise<any> {
      throw new Error('Method not implemented.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function failingStream(stateDependenciesMock: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class FailingStream extends StreamActiveRecord<any> {
    protected async doHandleUpsertChange(): Promise<{
      cascadingChanges: StreamChange[];
      changeStatus: StreamChangeStatus;
    }> {
      return {
        cascadingChanges: [],
        changeStatus: 'upserted',
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async doHandleDeleteChange(): Promise<any> {
      return {
        cascadingChanges: [],
        changeStatus: 'deleted',
      };
    }
    protected async doValidateUpsertion(): Promise<ValidationResult> {
      return { isValid: true, errors: [] };
    }
    protected async doValidateDeletion(): Promise<ValidationResult> {
      return { isValid: true, errors: [] };
    }
    protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
      throw new Error('Some test failure');
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
    protected async doDetermineUpdateActions(): Promise<ElasticsearchAction[]> {
      return [
        {
          type: 'upsert_dot_streams_document',
          request: this.definition,
        },
      ];
    }
    protected doClone(): StreamActiveRecord<Streams.all.Definition> {
      return new FailingStream(this.definition, this.dependencies);
    }
  }

  return new FailingStream(
    {
      name: 'stream_that_fails',
    },
    stateDependenciesMock
  );
}

function flowStream() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class FlowStream extends StreamActiveRecord<any> {
    protected async doHandleUpsertChange(
      definition: Streams.all.Definition
    ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
      return {
        cascadingChanges: [],
        changeStatus: definition.name === this.definition.name ? 'upserted' : this.changeStatus,
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    protected doClone(): StreamActiveRecord<Streams.all.Definition> {
      return new FlowStream(this.definition, this.dependencies);
    }
  }

  return FlowStream;
}
