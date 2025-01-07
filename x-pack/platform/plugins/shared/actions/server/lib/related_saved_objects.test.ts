/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validatedRelatedSavedObjects } from './related_saved_objects';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Logger } from '@kbn/core/server';

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
