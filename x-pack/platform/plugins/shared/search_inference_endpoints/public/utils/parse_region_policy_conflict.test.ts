/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseRegionPolicyConflict } from './parse_region_policy_conflict';

const realConflictAttributes = {
  denied_endpoint_ids: ['.elser-2-elastic', '.jina-embeddings-v5-text-small'],
  referencing_pipelines: '.elser-2-elastic:region-policy-force-test',
  referencing_indexes: [
    '.elser-2-elastic:region-policy-force-test-index',
    '.jina-embeddings-v5-text-small:.integration_knowledge-7',
  ],
};

describe('parseRegionPolicyConflict', () => {
  it('groups the ES 409 payload by artifact with denied endpoint ids', () => {
    expect(parseRegionPolicyConflict(realConflictAttributes)).toEqual([
      {
        type: 'index',
        name: 'region-policy-force-test-index',
        endpointIds: ['.elser-2-elastic'],
      },
      {
        type: 'index',
        name: '.integration_knowledge-7',
        endpointIds: ['.jina-embeddings-v5-text-small'],
      },
      {
        type: 'pipeline',
        name: 'region-policy-force-test',
        endpointIds: ['.elser-2-elastic'],
      },
    ]);
  });

  it('normalizes a single string ref the same way as a one-element array', () => {
    const fromString = parseRegionPolicyConflict({
      denied_endpoint_ids: '.elser-2-elastic',
      referencing_indexes: '.elser-2-elastic:my-index',
    });
    const fromArray = parseRegionPolicyConflict({
      denied_endpoint_ids: ['.elser-2-elastic'],
      referencing_indexes: ['.elser-2-elastic:my-index'],
    });

    expect(fromString).toEqual(fromArray);
    expect(fromString).toEqual([
      { type: 'index', name: 'my-index', endpointIds: ['.elser-2-elastic'] },
    ]);
  });

  it('merges denied endpoint ids when the same artifact appears more than once', () => {
    expect(
      parseRegionPolicyConflict({
        denied_endpoint_ids: ['.elser-2-elastic', '.jina-embeddings-v5-text-small'],
        referencing_indexes: [
          '.elser-2-elastic:shared-index',
          '.jina-embeddings-v5-text-small:shared-index',
        ],
      })
    ).toEqual([
      {
        type: 'index',
        name: 'shared-index',
        endpointIds: ['.elser-2-elastic', '.jina-embeddings-v5-text-small'],
      },
    ]);
  });

  it('returns undefined for a concurrent-update 409 with no denied endpoints', () => {
    expect(parseRegionPolicyConflict({ message: 'concurrent update' })).toBeUndefined();
    expect(parseRegionPolicyConflict(undefined)).toBeUndefined();
    expect(
      parseRegionPolicyConflict({
        referencing_indexes: ['.elser-2-elastic:my-index'],
      })
    ).toBeUndefined();
  });

  it('skips malformed refs that have no endpoint-to-artifact separator', () => {
    expect(
      parseRegionPolicyConflict({
        denied_endpoint_ids: ['.elser-2-elastic'],
        referencing_indexes: ['not-a-ref', ':missing-endpoint', '.elser-2-elastic:'],
      })
    ).toBeUndefined();
  });

  it('keeps colons inside a denied endpoint id when grouping refs', () => {
    expect(
      parseRegionPolicyConflict({
        denied_endpoint_ids: ['team:model-a', '.elser-2-elastic'],
        referencing_indexes: ['team:model-a:my-index', '.elser-2-elastic:other-index'],
      })
    ).toEqual([
      { type: 'index', name: 'my-index', endpointIds: ['team:model-a'] },
      { type: 'index', name: 'other-index', endpointIds: ['.elser-2-elastic'] },
    ]);
  });
});
