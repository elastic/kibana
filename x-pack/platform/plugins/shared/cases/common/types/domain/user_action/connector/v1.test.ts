/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../connector/v1';
import { ConnectorUserActionPayloadWithoutConnectorIdRt } from './v1';

describe('Connector', () => {
  describe('ConnectorUserActionPayloadWithoutConnectorIdRt', () => {
    const defaultRequest = {
      connector: {
        name: 'My JIRA connector',
        type: ConnectorTypes.jira,
        fields: {
          issueType: 'bug',
          priority: 'high',
          parent: '2',
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = ConnectorUserActionPayloadWithoutConnectorIdRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConnectorUserActionPayloadWithoutConnectorIdRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from fields', () => {
      const query = ConnectorUserActionPayloadWithoutConnectorIdRt.decode({
        ...defaultRequest,
        fields: { ...defaultRequest.connector.fields, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
