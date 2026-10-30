/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../connector/v1';
import { UserActionTypes } from '../action/v1';
import { CreateCaseUserActionSchema, CreateCaseUserActionWithoutConnectorIdSchema } from './v1';

describe('Create case', () => {
  describe('CreateCaseUserActionSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.create_case,
      payload: {
        connector: {
          id: 'jira-connector-id',
          type: ConnectorTypes.jira,
          name: 'jira-connector',
          fields: {
            issueType: 'bug',
            priority: 'high',
            parent: '2',
          },
        },
        assignees: [{ uid: '1' }],
        description: 'sample description',
        status: 'open',
        severity: 'low',
        tags: ['one'],
        title: 'sample title',
        settings: {
          syncAlerts: false,
          extractObservables: false,
        },
        owner: 'cases',
      },
    };

    it('has expected attributes in request', () => {
      const result = CreateCaseUserActionSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('empty category is decoded properly', () => {
      const defaultRequestEmptyCategory = {
        ...defaultRequest,
        payload: { ...defaultRequest.payload, category: null },
      };

      const result = CreateCaseUserActionSchema.safeParse(defaultRequestEmptyCategory);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequestEmptyCategory);
    });

    it('string category is decoded properly', () => {
      const defaultRequestStringCategory = {
        ...defaultRequest,
        payload: { ...defaultRequest.payload, category: 'sci-fi' },
      };

      const result = CreateCaseUserActionSchema.safeParse(defaultRequestStringCategory);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequestStringCategory);
    });

    it('customFields are decoded correctly', () => {
      const customFields = [
        {
          key: 'first_custom_field_key',
          type: 'text',
          value: 'this is a text field value',
        },
        {
          key: 'second_custom_field_key',
          type: 'toggle',
          value: true,
        },
      ];

      const defaultRequestWithCustomFields = {
        ...defaultRequest,
        payload: { ...defaultRequest.payload, customFields },
      };

      const result = CreateCaseUserActionSchema.safeParse(defaultRequestWithCustomFields);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequestWithCustomFields);
    });

    it('strips unknown fields', () => {
      const result = CreateCaseUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = CreateCaseUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CreateCaseUserActionWithoutConnectorIdSchema', () => {
    const defaultRequest = {
      type: UserActionTypes.create_case,
      payload: {
        connector: {
          type: ConnectorTypes.jira,
          name: 'jira-connector',
          fields: {
            issueType: 'bug',
            priority: 'high',
            parent: '2',
          },
        },
        assignees: [{ uid: '1' }],
        description: 'sample description',
        status: 'open',
        severity: 'low',
        tags: ['one'],
        title: 'sample title',
        settings: {
          syncAlerts: false,
          extractObservables: false,
        },
        owner: 'cases',
      },
    };

    it('has expected attributes in request', () => {
      const result = CreateCaseUserActionWithoutConnectorIdSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('empty category in request', () => {
      const requestWithEmptyCategory = {
        ...defaultRequest,
        payload: { ...defaultRequest.payload, category: null },
      };

      const result =
        CreateCaseUserActionWithoutConnectorIdSchema.safeParse(requestWithEmptyCategory);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithEmptyCategory);
    });

    it('string category in request', () => {
      const requestWithStringCategory = {
        ...defaultRequest,
        payload: { ...defaultRequest.payload, category: 'romance' },
      };

      const result =
        CreateCaseUserActionWithoutConnectorIdSchema.safeParse(requestWithStringCategory);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(requestWithStringCategory);
    });

    it('customFields are decoded correctly', () => {
      const customFields = [
        {
          key: 'first_custom_field_key',
          type: 'text',
          value: 'this is a text field value',
        },
        {
          key: 'second_custom_field_key',
          type: 'toggle',
          value: true,
        },
      ];

      const defaultRequestWithCustomFields = {
        ...defaultRequest,
        payload: { ...defaultRequest.payload, customFields },
      };

      const result = CreateCaseUserActionWithoutConnectorIdSchema.safeParse(
        defaultRequestWithCustomFields
      );
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequestWithCustomFields);
    });

    it('strips unknown fields', () => {
      const result = CreateCaseUserActionWithoutConnectorIdSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from payload', () => {
      const result = CreateCaseUserActionWithoutConnectorIdSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
