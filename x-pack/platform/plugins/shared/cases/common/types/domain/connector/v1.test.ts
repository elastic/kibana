/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConnectorTypes,
  ConnectorTypeFieldsSchema,
  CaseUserActionConnectorSchema,
  CaseConnectorSchema,
  ConnectorMappingsSchema,
  ConnectorMappingsAttributesSchema,
} from './v1';

describe('Connector', () => {
  describe('ConnectorTypeFieldsSchema', () => {
    const defaultRequest = {
      type: ConnectorTypes.jira,
      fields: {
        issueType: 'bug',
        priority: 'high',
        parent: '2',
      },
    };

    it('has expected attributes in request', () => {
      const result = ConnectorTypeFieldsSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ConnectorTypeFieldsSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from fields', () => {
      const result = ConnectorTypeFieldsSchema.safeParse({
        ...defaultRequest,
        fields: { ...defaultRequest.fields, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CaseUserActionConnectorSchema', () => {
    const defaultRequest = {
      type: ConnectorTypes.jira,
      name: 'jira connector',
      fields: {
        issueType: 'bug',
        priority: 'high',
        parent: '2',
      },
    };

    it('has expected attributes in request', () => {
      const result = CaseUserActionConnectorSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CaseUserActionConnectorSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from fields', () => {
      const result = CaseUserActionConnectorSchema.safeParse({
        ...defaultRequest,
        fields: { ...defaultRequest.fields, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CaseConnectorSchema', () => {
    const defaultRequest = {
      type: ConnectorTypes.jira,
      name: 'jira connector',
      id: 'jira-connector-id',
      fields: {
        issueType: 'bug',
        priority: 'high',
        parent: '2',
      },
    };

    it('has expected attributes in request', () => {
      const result = CaseConnectorSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CaseConnectorSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from fields', () => {
      const result = CaseConnectorSchema.safeParse({
        ...defaultRequest,
        fields: { ...defaultRequest.fields, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('mappings', () => {
    const mappings = [
      {
        action_type: 'overwrite',
        source: 'title',
        target: 'unknown',
      },
      {
        action_type: 'append',
        source: 'description',
        target: 'not_mapped',
      },
    ];

    const attributes = {
      mappings: [
        {
          action_type: 'overwrite',
          source: 'title',
          target: 'unknown',
        },
        {
          action_type: 'append',
          source: 'description',
          target: 'not_mapped',
        },
      ],
      owner: 'cases',
    };

    describe('ConnectorMappingsSchema', () => {
      it('has expected attributes in request', () => {
        const result = ConnectorMappingsSchema.safeParse(mappings);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(mappings);
      });

      it('strips unknown fields from mappings', () => {
        const result = ConnectorMappingsSchema.safeParse([
          { ...mappings[0] },
          { action_type: 'append', source: 'description', target: 'not_mapped', foo: 'bar' },
        ]);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(mappings);
      });
    });

    describe('ConnectorMappingsAttributesSchema', () => {
      it('has expected attributes in request', () => {
        const result = ConnectorMappingsAttributesSchema.safeParse(attributes);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(attributes);
      });

      it('strips unknown fields', () => {
        const result = ConnectorMappingsAttributesSchema.safeParse({ ...attributes, foo: 'bar' });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(attributes);
      });

      it('strips unknown fields from mappings', () => {
        const result = ConnectorMappingsAttributesSchema.safeParse({
          ...attributes,
          mappings: [{ ...attributes.mappings[0], foo: 'bar' }],
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ ...attributes, mappings: [attributes.mappings[0]] });
      });
    });
  });
});
