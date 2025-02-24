/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow } from '../runtime_types';
import { ConnectorMappingsAttributesPartialRt } from './connector_mappings';

describe('mappings', () => {
  describe('ConnectorMappingsAttributesPartialRt', () => {
    it('strips excess fields from the object', () => {
      const res = decodeOrThrow(ConnectorMappingsAttributesPartialRt)({
        bananas: 'yes',
        owner: 'hi',
      });
      expect(res).toStrictEqual({
        owner: 'hi',
      });
    });

    it('does not throw when the object is empty', () => {
      expect(() => decodeOrThrow(ConnectorMappingsAttributesPartialRt)({})).not.toThrow();
    });
  });
});
