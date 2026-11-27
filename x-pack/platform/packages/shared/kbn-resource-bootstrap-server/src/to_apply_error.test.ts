/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { toApplyError } from './to_apply_error';

describe('toApplyError', () => {
  it.each([
    ['bad request', Boom.badRequest('too many spaces')],
    ['payload too large', Boom.entityTooLarge('too big')],
    ['unprocessable body', Boom.badData('invalid body')],
  ])('marks a %s permanent, since a retry gets the same answer', (_, error) => {
    expect(toApplyError(error)).toEqual({ message: error.message, permanent: true });
  });

  it('marks a saved objects client error permanent, since those are Boom errors too', () => {
    expect(toApplyError(SavedObjectsErrorHelpers.createBadRequestError('invalid'))).toEqual({
      message: expect.stringContaining('invalid'),
      permanent: true,
    });
  });

  it('leaves a conflict retryable and marks it a conflict, since it created nothing', () => {
    expect(toApplyError(Boom.conflict('taken'))).toEqual({ message: 'taken', conflict: true });
    expect(
      toApplyError(SavedObjectsErrorHelpers.createConflictError('index-pattern', 'a'))
    ).toEqual({ message: expect.stringContaining('conflict'), conflict: true });
  });

  it.each([
    ['not found', Boom.notFound('gone')],
    ['timeout', Boom.clientTimeout('slow')],
    ['too many requests', Boom.tooManyRequests('busy')],
    ['unauthorized', Boom.unauthorized('expired credentials')],
    ['forbidden', Boom.forbidden('index has a write block')],
  ])('leaves a %s retryable, since it can go away before the retry', (_, error) => {
    expect(toApplyError(error)).toEqual({ message: error.message });
  });

  it('leaves a server error retryable', () => {
    expect(toApplyError(Boom.badImplementation('broken'))).toEqual({ message: 'broken' });
  });

  it('leaves anything that is not a Boom error retryable', () => {
    expect(toApplyError(new Error('elasticsearch is down'))).toEqual({
      message: 'elasticsearch is down',
    });
    expect(toApplyError('boom')).toEqual({ message: 'boom' });
  });
});
