/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { autoApprovedApisSchema } from './approvals_schema';

const buildSchema = (knownApisOnly: boolean) =>
  autoApprovedApisSchema({ scope: 'this run', description: 'Approvals.', knownApisOnly });

describe('autoApprovedApisSchema', () => {
  describe('when only known APIs are accepted', () => {
    const approvalsSchema = buildSchema(true);

    it('accepts exact identifiers, namespace wildcards, and `*`', () => {
      const approvals = { elasticsearch: ['indices.delete', 'indices.*'], kibana: ['*'] };

      expect(approvalsSchema.validate(approvals)).toEqual(approvals);
    });

    it('rejects a selector the API manifests do not ship', () => {
      expect(() => approvalsSchema.validate({ elasticsearch: ['indices.drop'] })).toThrow(
        'Unknown api "indices.drop" for target "elasticsearch".'
      );
    });
  });

  describe('when unknown APIs are accepted', () => {
    const approvalsSchema = buildSchema(false);

    it('keeps a selector the API manifests do not ship', () => {
      const approvals = { elasticsearch: ['indices.drop'], kibana: ['retired-namespace.*'] };

      expect(approvalsSchema.validate(approvals)).toEqual(approvals);
    });

    it('still bounds the length of each selector', () => {
      expect(() => approvalsSchema.validate({ kibana: ['a'.repeat(257)] })).toThrow(
        'maximum length of [256]'
      );
    });

    it('still bounds the number of selectors', () => {
      const tooManySelectors = Array.from({ length: 101 }, (_, index) => `namespace.api-${index}`);

      expect(() => approvalsSchema.validate({ kibana: tooManySelectors })).toThrow(
        'cannot be greater than [100]'
      );
    });
  });
});
