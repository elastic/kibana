/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  connectorAuthCounter,
  connectorCreateCounter,
  connectorExecuteCounter,
  connectorExecuteDuration,
  getConnectorAuthInitiateErrorType,
  getConnectorAuthType,
  getConnectorCreateErrorType,
  recordConnectorAuth,
  recordConnectorCreate,
  recordConnectorExecute,
} from './connector_metrics';

describe('connector metrics', () => {
  beforeEach(() => {
    jest.spyOn(connectorCreateCounter, 'add').mockImplementation(() => {});
    jest.spyOn(connectorExecuteCounter, 'add').mockImplementation(() => {});
    jest.spyOn(connectorExecuteDuration, 'record').mockImplementation(() => {});
    jest.spyOn(connectorAuthCounter, 'add').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getConnectorAuthType', () => {
    it('prefers secrets over config', () => {
      expect(
        getConnectorAuthType({ config: { authType: 'basic' }, secrets: { authType: 'ears' } })
      ).toBe('ears');
    });

    it('falls back to config, then to none', () => {
      expect(getConnectorAuthType({ config: { authType: 'basic' }, secrets: {} })).toBe('basic');
      expect(getConnectorAuthType({ config: {}, secrets: {} })).toBe('none');
      expect(getConnectorAuthType({})).toBe('none');
    });
  });

  describe('getConnectorCreateErrorType', () => {
    it.each([
      [Boom.badRequest('bad'), 'invalid'],
      [Boom.forbidden('no'), 'unauthorized'],
      [Boom.unauthorized('no'), 'unauthorized'],
      [Boom.conflict('dup'), 'conflict'],
      [Boom.internal('oops'), 'other'],
      [new Error('plain'), 'other'],
    ])('maps %p to %s', (error, expected) => {
      expect(getConnectorCreateErrorType(error)).toBe(expected);
    });
  });

  describe('getConnectorAuthInitiateErrorType', () => {
    it.each([
      [400, 'invalid'],
      [404, 'invalid'],
      [401, 'unauthorized'],
      [403, 'unauthorized'],
      [429, 'rate_limited'],
      [500, 'other'],
    ])('maps status %s to %s', (statusCode, expected) => {
      expect(getConnectorAuthInitiateErrorType(statusCode)).toBe(expected);
    });
  });

  describe('recordConnectorCreate', () => {
    it('records a success without an error type', () => {
      recordConnectorCreate({ connectorType: '.google_drive', authType: 'ears' });

      expect(connectorCreateCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.google_drive',
        'connector.auth_type': 'ears',
        success: true,
      });
    });

    it('records a failure with its error type', () => {
      recordConnectorCreate({
        connectorType: '.google_drive',
        authType: 'ears',
        errorType: 'conflict',
      });

      expect(connectorCreateCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.google_drive',
        'connector.auth_type': 'ears',
        success: false,
        'error.type': 'conflict',
      });
    });
  });

  describe('recordConnectorExecute', () => {
    it('records a success with its sub-action and duration', () => {
      recordConnectorExecute({
        connectorType: '.sharepoint',
        subAction: 'search',
        durationMs: 120,
      });

      const attributes = {
        'connector.type': '.sharepoint',
        'connector.sub_action': 'search',
        success: true,
      };
      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(1, attributes);
      expect(connectorExecuteDuration.record).toHaveBeenCalledWith(120, attributes);
    });

    it('records a failure with error type and source on the counter only', () => {
      recordConnectorExecute({
        connectorType: '.sharepoint',
        subAction: 'search',
        errorType: 'unauthorized',
        errorSource: 'user',
        durationMs: 5,
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.sharepoint',
        'connector.sub_action': 'search',
        success: false,
        'error.type': 'unauthorized',
        'error.source': 'user',
      });
      expect(connectorExecuteDuration.record).toHaveBeenCalledWith(5, {
        'connector.type': '.sharepoint',
        'connector.sub_action': 'search',
        success: false,
        'error.type': 'unauthorized',
      });
    });

    it('omits the sub-action and the duration when they are not known', () => {
      recordConnectorExecute({
        connectorType: '.sharepoint',
        errorType: 'rate_limited',
        errorSource: 'user',
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.sharepoint',
        success: false,
        'error.type': 'rate_limited',
        'error.source': 'user',
      });
      expect(connectorExecuteDuration.record).not.toHaveBeenCalled();
    });
  });

  describe('recordConnectorAuth', () => {
    it('records a success without a connector type when it is not known', () => {
      recordConnectorAuth({ phase: 'token', authType: 'oauth_client_credentials' });

      expect(connectorAuthCounter.add).toHaveBeenCalledWith(1, {
        'auth.phase': 'token',
        'connector.auth_type': 'oauth_client_credentials',
        success: true,
      });
    });

    it('records a failure with the connector type and error type', () => {
      recordConnectorAuth({
        phase: 'execute',
        authType: 'ears',
        connectorType: '.google_drive',
        errorType: 'authorization_failed',
      });

      expect(connectorAuthCounter.add).toHaveBeenCalledWith(1, {
        'auth.phase': 'execute',
        'connector.auth_type': 'ears',
        'connector.type': '.google_drive',
        success: false,
        'error.type': 'authorization_failed',
      });
    });
  });
});
