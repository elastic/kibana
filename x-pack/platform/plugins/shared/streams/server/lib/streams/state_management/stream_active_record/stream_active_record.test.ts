/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { StreamActiveRecord } from './stream_active_record';

describe('StreamActiveRecord', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateDependenciesMock = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateMock = {} as any;
  const cascadingUpsert = { type: 'upsert', definition: { test: 'cascade' } };
  const cascadingDelete = { type: 'delete', name: 'cascade' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class TestStream extends StreamActiveRecord<any> {
    doClone(): StreamActiveRecord<Streams.all.Definition> {
      return new TestStream(this.definition, this.dependencies);
    }

    doHandleUpsertChange = jest.fn().mockImplementation(() => ({
      cascadingChanges: [cascadingUpsert],
      changeStatus: 'upserted',
    }));
    doHandleDeleteChange = jest.fn().mockImplementation(() => ({
      cascadingChanges: [cascadingDelete],
      changeStatus: 'deleted',
    }));
    doValidateUpsertion = jest.fn().mockImplementation(() => ({
      isValid: false,
      errors: ['test_upserted'],
    }));
    doValidateDeletion = jest.fn().mockImplementation(() => ({
      isValid: false,
      errors: ['test_deleted'],
    }));
    doDetermineCreateActions = jest.fn().mockImplementation(() => ['create_actions']);
    doDetermineUpdateActions = jest.fn().mockImplementation(() => ['update_actions']);
    doDetermineDeleteActions = jest.fn().mockImplementation(() => ['delete_actions']);
  }

  it('can be marked as created or deleted', () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);

    expect(stream.changeStatus).toEqual('unchanged');
    stream.markAsUpserted();
    expect(stream.changeStatus).toEqual('upserted');
    stream.markAsDeleted();
    expect(stream.changeStatus).toEqual('deleted');
    expect(stream.isDeleted()).toEqual(true);
    expect(stream.hasChanged()).toEqual(true);
  });

  it('calls doHandleUpsertChange hook and updates changeStatus and returns cascading changes', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);

    const cascadingChanges = await stream.applyChange(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: 'upsert', definition: { test: 'definition' } as any },
      stateMock,
      stateMock
    );

    expect(stream.doHandleUpsertChange).toBeCalledWith(
      { test: 'definition' },
      stateMock,
      stateMock
    );
    expect(cascadingChanges).toEqual([cascadingUpsert]);
    expect(stream.changeStatus).toEqual('upserted');
  });

  it('calls doHandleDeleteChange hook and updates changeStatus and returns cascading changes', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);

    const cascadingChanges = await stream.applyChange(
      { type: 'delete', name: 'test' },
      stateMock,
      stateMock
    );

    expect(stream.doHandleDeleteChange).toBeCalledWith('test', stateMock, stateMock);
    expect(cascadingChanges).toEqual([cascadingDelete]);
    expect(stream.changeStatus).toEqual('deleted');
  });

  it('calls doValidateUpsertion hook on a upserted stream', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);
    stream.markAsUpserted();

    const validationResult = await stream.validate(stateMock, stateMock);

    expect(stream.doValidateUpsertion).toBeCalledWith(stateMock, stateMock);
    expect(validationResult).toEqual({ isValid: false, errors: ['test_upserted'] });
  });

  it('calls doValidateDeletion hook on a deleted stream', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);
    stream.markAsDeleted();

    const validationResult = await stream.validate(stateMock, stateMock);

    expect(stream.doValidateDeletion).toBeCalledWith(stateMock, stateMock);
    expect(validationResult).toEqual({ isValid: false, errors: ['test_deleted'] });
  });

  it('treats unchanged streams as valid by default', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);

    const validationResult = await stream.validate(stateMock, stateMock);

    expect(stream.doValidateUpsertion).not.toBeCalled();
    expect(stream.doValidateDeletion).not.toBeCalled();
    expect(validationResult).toEqual({ isValid: true, errors: [] });
  });

  it('always returns a validation result', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);
    stream.markAsDeleted();
    stream.doValidateDeletion.mockImplementationOnce(() => {
      throw new Error('test_error');
    });

    const validationResult = await stream.validate(stateMock, stateMock);

    expect(validationResult.isValid).toEqual(false);
    expect(validationResult.errors.map((error) => error.message)).toEqual(['test_error']);
  });

  it('calls doDetermineCreateActions hook on stream that was added to the state', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);
    stream.markAsUpserted();

    const elasticsearchActions = await stream.determineElasticsearchActions(
      stateMock,
      stateMock,
      undefined
    );

    expect(stream.doDetermineCreateActions).toBeCalled();
    expect(elasticsearchActions).toEqual(['create_actions']);
  });

  it('calls doDetermineUpdateActions hook on stream that updated in the state', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);
    stream.markAsUpserted();

    const elasticsearchActions = await stream.determineElasticsearchActions(
      stateMock,
      stateMock,
      new TestStream({ name: 'test_stream' }, stateDependenciesMock)
    );

    expect(stream.doDetermineUpdateActions).toBeCalled();
    expect(elasticsearchActions).toEqual(['update_actions']);
  });

  it('calls doDetermineDeleteActions hook on stream that deleted from the state', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);
    stream.markAsDeleted();

    const elasticsearchActions = await stream.determineElasticsearchActions(
      stateMock,
      stateMock,
      undefined
    );

    expect(stream.doDetermineDeleteActions).toBeCalled();
    expect(elasticsearchActions).toEqual(['delete_actions']);
  });

  it('fails to determine Elasticsearch actions for an unchanged stream', async () => {
    const stream = new TestStream({ name: 'test_stream' }, stateDependenciesMock);
    await expect(async () => {
      await stream.determineElasticsearchActions(stateMock, stateMock, undefined);
    }).rejects.toThrow('Cannot determine Elasticsearch actions for an unchanged stream');
  });

  it('supports passing the result of toPrintable to JSON.stringify', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const object1: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const object2: any = { object1 };
    object1.object2 = object2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circularStateDependenciesMock = { object1, object2 } as any;

    const stream = new TestStream({ name: 'test_stream' }, circularStateDependenciesMock);
    const printableStream = stream.toPrintable();

    expect(() => {
      JSON.stringify(printableStream);
    }).not.toThrow();
  });
});
