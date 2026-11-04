/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import Boom from '@hapi/boom';
import {
  createTaskRunError,
  deserializeTaskRunError,
  serializeTaskRunError,
  getErrorSource,
  isUnrecoverableError,
  isUserError,
  TaskErrorSource,
  throwUnrecoverableError,
} from './errors';

describe('Error Types', () => {
  describe('Unrecoverable error', () => {
    it('wraps and throws normal errors', () => {
      expect(() => throwUnrecoverableError(new Error('OMG'))).toThrow('OMG');
    });

    it('idnentifies wrapped normal errors', async () => {
      let result;
      try {
        throwUnrecoverableError(new Error('OMG'));
      } catch (ex) {
        result = ex;
      }
      expect(isUnrecoverableError(result)).toBeTruthy();
    });

    it('idnentifies normal errors', () => {
      expect(isUnrecoverableError(new Error('OMG'))).toBeFalsy();
    });

    it('createTaskRunError', () => {
      expect(isUserError(createTaskRunError(new Error('OMG'), TaskErrorSource.USER))).toBeTruthy();
    });

    it('createTaskRunError without errorSourceParam ', () => {
      expect(getErrorSource(createTaskRunError(new Error('OMG')))).toBe(TaskErrorSource.FRAMEWORK);
    });

    it('getErrorSource', () => {
      expect(getErrorSource(createTaskRunError(new Error('OMG'), TaskErrorSource.USER))).toBe(
        TaskErrorSource.USER
      );
    });

    it('getErrorSource return undefined when there is no source data', () => {
      expect(getErrorSource(new Error('OMG'))).toBeUndefined();
    });

    it('getErrorSource return USER for authentication response errors', () => {
      const error = new errors.ResponseError({
        warnings: [],
        meta: {} as never,
        statusCode: 401,
      });
      expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
    });

    it('getErrorSource return undefined for non-authentication response errors', () => {
      const error = new errors.ResponseError({
        warnings: [],
        meta: {} as never,
        statusCode: 404,
      });
      expect(getErrorSource(error)).toBe(undefined);
    });
  });

  describe('status codes across a process boundary', () => {
    it('keeps a Boom status code', () => {
      const rebuilt = deserializeTaskRunError(serializeTaskRunError(Boom.notFound('gone')));
      expect(rebuilt).toMatchObject({ statusCode: 404, output: { statusCode: 404 } });
    });

    it('keeps an Elasticsearch response status code', () => {
      const error = Object.assign(new Error('no master'), { meta: { statusCode: 503 } });
      expect(deserializeTaskRunError(serializeTaskRunError(error))).toMatchObject({
        meta: { statusCode: 503 },
      });
    });

    it('adds no status code to errors that never had one', () => {
      expect(serializeTaskRunError(new Error('plain'))).not.toHaveProperty('statusCode');
    });
  });
});
