/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../connector/v1';
import { ConnectorUserActionPayloadWithoutConnectorIdSchema } from './v1';

describe('Connector', () => {
  describe('ConnectorUserActionPayloadWithoutConnectorIdSchema', () => {
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
      const result = ConnectorUserActionPayloadWithoutConnectorIdSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ConnectorUserActionPayloadWithoutConnectorIdSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields from fields', () => {
      const result = ConnectorUserActionPayloadWithoutConnectorIdSchema.safeParse({
        ...defaultRequest,
        fields: { ...defaultRequest.connector.fields, foo: 'bar' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
