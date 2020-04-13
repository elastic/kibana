/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getActionTypeRegistryMock } from './test_utils';
import { isUuidv4, getActionTypeName, validateMustache, validateActionParams } from './utils';

describe('stepRuleActions utils', () => {
  describe('isUuidv4', () => {
    it('should validate proper uuid v4 value', () => {
      expect(isUuidv4('817b8bca-91d1-4729-8ee1-3a83aaafd9d4')).toEqual(true);
    });

    it('should validate incorrect uuid v4 value', () => {
      expect(isUuidv4('ad9d4')).toEqual(false);
    });
  });

  describe('getActionTypeName', () => {
    it('should return capitalized action type name', () => {
      expect(getActionTypeName('.slack')).toEqual('Slack');
    });

    it('should return empty string actionTypeId had improper format', () => {
      expect(getActionTypeName('slack')).toEqual('');
    });
  });

  describe('validateMustache', () => {
    it('should validate mustache template', () => {
      expect(
        validateMustache({
          message: 'Mustache Template {{variable}}',
        })
      ).toHaveLength(0);
    });

    it('should validate incorrect mustache template', () => {
      expect(
        validateMustache({
          message: 'Mustache Template {{{variable}}',
        })
      ).toHaveLength(1);
    });
  });

  describe('validateActionParams', () => {
    let validateParamsMock: jest.Mock;

    beforeAll(() => {
      validateParamsMock = jest.fn();
    });

    it('should validate action params', () => {
      validateParamsMock.mockReturnValue({ errors: [] });
      const actionTypeRegistryMock = getActionTypeRegistryMock(validateParamsMock);

      expect(
        validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {
              message: 'Message',
            },
          },
          actionTypeRegistryMock
        )
      ).toHaveLength(0);
    });

    it('should validate incorrect action params', () => {
      validateParamsMock.mockReturnValue({
        errors: ['Message is required'],
      });
      const actionTypeRegistryMock = getActionTypeRegistryMock(validateParamsMock);

      expect(
        validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistryMock
        )
      ).toHaveLength(1);
    });

    it('should validate incorrect action params and filter error objects', () => {
      validateParamsMock.mockReturnValue({
        errors: [
          {
            message: 'Message is required',
          },
        ],
      });
      const actionTypeRegistryMock = getActionTypeRegistryMock(validateParamsMock);

      expect(
        validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistryMock
        )
      ).toHaveLength(0);
    });

    it('should validate incorrect action params and filter duplicated errors', () => {
      validateParamsMock.mockReturnValue({
        errors: ['Message is required', 'Message is required', 'Message is required'],
      });
      const actionTypeRegistryMock = getActionTypeRegistryMock(validateParamsMock);

      expect(
        validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistryMock
        )
      ).toHaveLength(1);
    });
  });
});
