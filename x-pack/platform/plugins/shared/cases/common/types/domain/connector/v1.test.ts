/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConnectorTypeFieldsSchema,
  CaseUserActionConnectorSchema,
  CaseConnectorSchema,
  ConnectorMappingsSchema,
  ConnectorMappingsAttributesSchema,
} from '../../domain_zod/connector/v1';
import {
  ConnectorTypeFieldsRt,
  CaseUserActionConnectorRt,
  CaseConnectorRt,
  ConnectorTypes,
  ConnectorMappingsAttributesRt,
  ConnectorMappingsRt,
} from './v1';

describe('Connector', () => {
  describe('ConnectorTypeFieldsRt', () => {
    const defaultRequest = {
      type: ConnectorTypes.jira,
      fields: {
        issueType: 'bug',
        priority: 'high',
        parent: '2',
      },
    };

    it('has expected attributes in request', () => {
      const query = ConnectorTypeFieldsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConnectorTypeFieldsRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from fields', () => {
      const query = ConnectorTypeFieldsRt.decode({
        ...defaultRequest,
        fields: { ...defaultRequest.fields, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('zod: has expected attributes in request', () => {
      const result = ConnectorTypeFieldsSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const result = ConnectorTypeFieldsSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields from fields', () => {
      const result = ConnectorTypeFieldsSchema.safeParse({
        ...defaultRequest,
        fields: { ...defaultRequest.fields, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CaseUserActionConnectorRt', () => {
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
      const query = CaseUserActionConnectorRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseUserActionConnectorRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from fields', () => {
      const query = CaseUserActionConnectorRt.decode({
        ...defaultRequest,
        fields: { ...defaultRequest.fields, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('zod: has expected attributes in request', () => {
      const result = CaseUserActionConnectorSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const result = CaseUserActionConnectorSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CaseConnectorRt', () => {
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
      const query = CaseConnectorRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseConnectorRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from fields', () => {
      const query = CaseConnectorRt.decode({
        ...defaultRequest,
        fields: { ...defaultRequest.fields, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('zod: has expected attributes in request', () => {
      const result = CaseConnectorSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const result = CaseConnectorSchema.safeParse({ ...defaultRequest, foo: 'bar' });
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

    describe('ConnectorMappingsRt', () => {
      it('has expected attributes in request', () => {
        const query = ConnectorMappingsRt.decode(mappings);

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: mappings,
        });
      });

      it('removes foo:bar attributes from mappings', () => {
        const query = ConnectorMappingsRt.decode([
          { ...mappings[0] },
          {
            action_type: 'append',
            source: 'description',
            target: 'not_mapped',
            foo: 'bar',
          },
        ]);

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: mappings,
        });
      });

      it('zod: has expected attributes in request', () => {
        const result = ConnectorMappingsSchema.safeParse(mappings);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(mappings);
      });

      it('zod: strips unknown fields from mappings', () => {
        const result = ConnectorMappingsSchema.safeParse([
          { ...mappings[0] },
          { action_type: 'append', source: 'description', target: 'not_mapped', foo: 'bar' },
        ]);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(mappings);
      });
    });

    describe('ConnectorMappingsAttributesRt', () => {
      it('has expected attributes in request', () => {
        const query = ConnectorMappingsAttributesRt.decode(attributes);

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: attributes,
        });
      });

      it('removes foo:bar attributes from request', () => {
        const query = ConnectorMappingsAttributesRt.decode({ ...attributes, foo: 'bar' });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: attributes,
        });
      });

      it('removes foo:bar attributes from mappings', () => {
        const query = ConnectorMappingsAttributesRt.decode({
          ...attributes,
          mappings: [{ ...attributes.mappings[0], foo: 'bar' }],
        });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: { ...attributes, mappings: [{ ...attributes.mappings[0] }] },
        });
      });

      it('zod: has expected attributes in request', () => {
        const result = ConnectorMappingsAttributesSchema.safeParse(attributes);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(attributes);
      });

      it('zod: strips unknown fields', () => {
        const result = ConnectorMappingsAttributesSchema.safeParse({ ...attributes, foo: 'bar' });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(attributes);
      });

      it('zod: strips unknown fields from mappings', () => {
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
