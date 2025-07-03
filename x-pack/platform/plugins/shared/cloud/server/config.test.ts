/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';
import { KIBANA_PRODUCT_TIERS, KIBANA_SOLUTIONS } from '@kbn/projects-solutions-groups';

describe('Cloud plugin config', () => {
  it('evicts unknown properties under the `serverless` structure', () => {
    const output = config.schema.validate({
      serverless: {
        project_id: 'project_id',
        unknown_prop: 'some unknown prop',
      },
    });

    expect(output.serverless).toEqual({
      project_id: 'project_id',
    });
  });

  describe('product_tier', () => {
    describe.each(KIBANA_SOLUTIONS)('For Kibana Solution "%s"', (solution) => {
      if (KIBANA_PRODUCT_TIERS[solution].length) {
        test.each(KIBANA_PRODUCT_TIERS[solution])('Validates product tier "%s"', (productTier) => {
          const output = config.schema.validate({
            serverless: {
              product_tier: productTier,
              project_type: solution,
            },
          });

          expect(output.serverless).toEqual(output.serverless);
        });
      }

      test('throws when any other product tier is provided', () => {
        expect(() =>
          config.schema.validate({
            serverless: {
              product_tier: 'anything invalid here',
              project_type: solution,
            },
          })
        ).toThrowErrorMatchingSnapshot();
      });
    });
  });
});
