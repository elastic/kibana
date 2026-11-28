/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionExecutionSourceType } from './action_execution_source';
import Boom from '@hapi/boom';
import {
  connectorAuthCounter,
  connectorCreateCounter,
  connectorExecuteCounter,
  connectorExecuteDuration,
  getConnectorAuthInitiateErrorType,
  getConnectorAuthType,
  getConnectorCreateErrorType,
  getConnectorExecuteOrigin,
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

  describe('getConnectorExecuteOrigin', () => {
    it.each([
      [ActionExecutionSourceType.SAVED_OBJECT, 'saved_object'],
      [ActionExecutionSourceType.HTTP_REQUEST, 'http_request'],
      [ActionExecutionSourceType.NOTIFICATION, 'notification'],
      [ActionExecutionSourceType.BACKGROUND_TASK, 'background_task'],
      [ActionExecutionSourceType.AGENT_BUILDER, 'agent_builder'],
      [undefined, 'none'],
    ])('maps %s to %s', (sourceType, expected) => {
      expect(getConnectorExecuteOrigin(sourceType)).toBe(expected);
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
      recordConnectorCreate({ connectorType: '.google_drive', authType: 'ears', specBased: true });

      expect(connectorCreateCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.google_drive',
        'connector.auth_type': 'ears',
        'connector.spec_based': true,
        success: true,
      });
    });

    it('records a failure with its error type', () => {
      recordConnectorCreate({
        connectorType: '.google_drive',
        authType: 'ears',
        specBased: true,
        errorType: 'conflict',
      });

      expect(connectorCreateCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.google_drive',
        'connector.auth_type': 'ears',
        'connector.spec_based': true,
        success: false,
        'error.type': 'conflict',
      });
    });
  });

  describe('recordConnectorExecute', () => {
    it('records a success with its sub-action and duration', () => {
      recordConnectorExecute({
        connectorType: '.sharepoint',
        specBased: true,
        origin: 'saved_object',
        subAction: 'search',
        durationMs: 120,
      });

      const attributes = {
        'connector.type': '.sharepoint',
        'connector.spec_based': true,
        'connector.origin': 'saved_object',
        'connector.sub_action': 'search',
        success: true,
      };
      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(1, attributes);
      expect(connectorExecuteDuration.record).toHaveBeenCalledWith(120, attributes);
    });

    it('records a failure with error type and source on the counter only', () => {
      recordConnectorExecute({
        connectorType: '.sharepoint',
        specBased: true,
        origin: 'saved_object',
        subAction: 'search',
        errorType: 'unauthorized',
        errorSource: 'user',
        durationMs: 5,
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.sharepoint',
        'connector.spec_based': true,
        'connector.origin': 'saved_object',
        'connector.sub_action': 'search',
        success: false,
        'error.type': 'unauthorized',
        'error.source': 'user',
      });
      expect(connectorExecuteDuration.record).toHaveBeenCalledWith(5, {
        'connector.type': '.sharepoint',
        'connector.spec_based': true,
        'connector.origin': 'saved_object',
        'connector.sub_action': 'search',
        success: false,
        'error.type': 'unauthorized',
      });
    });

    it('records the failure class on the counter, not on the duration', () => {
      recordConnectorExecute({
        connectorType: '.sharepoint',
        specBased: true,
        origin: 'agent_builder',
        subAction: 'search',
        errorType: 'other',
        errorSource: 'user',
        failureClass: 'vendor_4xx',
        durationMs: 8,
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.sharepoint',
        'connector.spec_based': true,
        'connector.origin': 'agent_builder',
        'connector.sub_action': 'search',
        success: false,
        'error.type': 'other',
        'error.source': 'user',
        'error.failure_class': 'vendor_4xx',
      });
      expect(connectorExecuteDuration.record).toHaveBeenCalledWith(8, {
        'connector.type': '.sharepoint',
        'connector.spec_based': true,
        'connector.origin': 'agent_builder',
        'connector.sub_action': 'search',
        success: false,
        'error.type': 'other',
      });
    });

    it('reports a known vendor status code as itself', () => {
      recordConnectorExecute({
        connectorType: '.slack',
        specBased: true,
        origin: 'saved_object',
        errorType: 'other',
        errorSource: 'user',
        failureClass: 'vendor_4xx',
        statusCode: 429,
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ 'error.status_code': '429', 'error.failure_class': 'vendor_4xx' })
      );
    });

    it('reports a status code outside the allowlist as unknown, keeping the label bounded', () => {
      recordConnectorExecute({
        connectorType: '.slack',
        specBased: true,
        origin: 'saved_object',
        errorType: 'other',
        errorSource: 'user',
        failureClass: 'vendor_4xx',
        statusCode: 418,
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ 'error.status_code': 'unknown' })
      );
    });

    it('leaves out the status code when the execution succeeded', () => {
      recordConnectorExecute({
        connectorType: '.slack',
        specBased: true,
        origin: 'saved_object',
        statusCode: 429,
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(
        1,
        expect.not.objectContaining({ 'error.status_code': expect.anything() })
      );
    });

    it('reports a known error name as itself', () => {
      recordConnectorExecute({
        connectorType: '.slack',
        specBased: true,
        origin: 'saved_object',
        errorType: 'other',
        errorSource: 'user',
        failureClass: 'handler',
        errorName: 'TypeError',
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ 'error.name': 'TypeError', 'error.failure_class': 'handler' })
      );
    });

    it('reports an error name outside the allowlist as unknown', () => {
      recordConnectorExecute({
        connectorType: '.slack',
        specBased: true,
        origin: 'saved_object',
        errorType: 'other',
        errorSource: 'user',
        failureClass: 'handler',
        errorName: 'SomeVendorSdkError',
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ 'error.name': 'unknown' })
      );
    });

    it('leaves out the failure class when the execution succeeded', () => {
      recordConnectorExecute({
        connectorType: '.sharepoint',
        specBased: true,
        origin: 'saved_object',
        failureClass: 'handler',
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.sharepoint',
        'connector.spec_based': true,
        'connector.origin': 'saved_object',
        success: true,
      });
    });

    it('omits the sub-action and the duration when they are not known', () => {
      recordConnectorExecute({
        connectorType: '.sharepoint',
        specBased: true,
        origin: 'saved_object',
        errorType: 'rate_limited',
        errorSource: 'user',
      });

      expect(connectorExecuteCounter.add).toHaveBeenCalledWith(1, {
        'connector.type': '.sharepoint',
        'connector.spec_based': true,
        'connector.origin': 'saved_object',
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
