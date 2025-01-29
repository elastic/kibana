/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    });
  });
});
