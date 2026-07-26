/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validatedRelatedSavedObjects } from './related_saved_objects';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';

const loggerMock = loggingSystemMock.createLogger();

describe('related_saved_objects', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('validates valid objects', () => {
    ensureValid(loggerMock, undefined);
    ensureValid(loggerMock, []);
    ensureValid(loggerMock, [
      {
        id: 'some-id',
        type: 'some-type',
      },
    ]);
    ensureValid(loggerMock, [
      {
        id: 'some-id',
        type: 'some-type',
        typeId: 'some-type-id',
      },
    ]);
    ensureValid(loggerMock, [
      {
        id: 'some-id',
        type: 'some-type',
        namespace: 'some-namespace',
      },
    ]);
    ensureValid(loggerMock, [
      {
        id: 'some-id',
        type: 'some-type',
        typeId: 'some-type-id',
        namespace: 'some-namespace',
      },
    ]);
    ensureValid(loggerMock, [
      {
        id: 'some-id',
        type: 'some-type',
      },
      {
        id: 'some-id-2',
        type: 'some-type-2',
      },
    ]);
  });
});

it('handles invalid objects', () => {
  ensureInvalid(loggerMock, 42);
  ensureInvalid(loggerMock, {});
  ensureInvalid(loggerMock, [{}]);
  ensureInvalid(loggerMock, [{ id: 'some-id' }]);
  ensureInvalid(loggerMock, [{ id: 42 }]);
  ensureInvalid(loggerMock, [{ id: 'some-id', type: 'some-type', x: 42 }]);
});

describe('empty string validation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects empty string for required id field', () => {
    const result = validatedRelatedSavedObjects(loggerMock, [{ id: '', type: 'some-type' }]);
    expect(result).toEqual([]);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('ignoring invalid related saved objects')
    );
  });

  it('rejects empty string for required type field', () => {
    const result = validatedRelatedSavedObjects(loggerMock, [{ id: 'some-id', type: '' }]);
    expect(result).toEqual([]);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('ignoring invalid related saved objects')
    );
  });

  it('rejects empty string for optional namespace field when provided', () => {
    const result = validatedRelatedSavedObjects(loggerMock, [
      { id: 'some-id', type: 'some-type', namespace: '' },
    ]);
    expect(result).toEqual([]);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('ignoring invalid related saved objects')
    );
  });

  it('rejects empty string for optional typeId field when provided', () => {
    const result = validatedRelatedSavedObjects(loggerMock, [
      { id: 'some-id', type: 'some-type', typeId: '' },
    ]);
    expect(result).toEqual([]);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('ignoring invalid related saved objects')
    );
  });

  it('accepts omitted optional namespace (undefined is allowed)', () => {
    const result = validatedRelatedSavedObjects(loggerMock, [
      { id: 'some-id', type: 'some-type', namespace: undefined },
    ]);
    expect(result).toEqual([{ id: 'some-id', type: 'some-type' }]);
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('accepts omitted optional typeId (undefined is allowed)', () => {
    const result = validatedRelatedSavedObjects(loggerMock, [
      { id: 'some-id', type: 'some-type', typeId: undefined },
    ]);
    expect(result).toEqual([{ id: 'some-id', type: 'some-type' }]);
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });
});

function ensureValid(logger: Logger, savedObjects: unknown) {
  const result = validatedRelatedSavedObjects(logger, savedObjects);
  expect(result).toEqual(savedObjects === undefined ? [] : savedObjects);
  expect(loggerMock.warn).not.toHaveBeenCalled();
}

function ensureInvalid(logger: Logger, savedObjects: unknown) {
  const result = validatedRelatedSavedObjects(logger, savedObjects);
  expect(result).toEqual([]);

  const message = loggerMock.warn.mock.calls[0][0];
  expect(message).toMatch(
    /ignoring invalid related saved objects: expected value of type \[array\] but got/
  );
}
