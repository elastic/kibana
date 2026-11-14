/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LATEST_INDEX_MAPPINGS_VERSION,
  LATEST_INDEX_MAPPINGS_VERSION_META_KEY,
  MAPPING_VERSION,
} from '../../../common/domain/entity_index';
import { getLatestEntityIndexTemplateConfig } from './latest_index_template';

describe('getLatestEntityIndexTemplateConfig', () => {
  it('stamps the mappings version and the latest mappings version in the mappings _meta', () => {
    const config = getLatestEntityIndexTemplateConfig('default');

    expect(config.template?.mappings?._meta).toEqual({
      mappingsVersion: MAPPING_VERSION,
      latestMappingsVersion: LATEST_INDEX_MAPPINGS_VERSION,
    });
    expect(config.template?.mappings?._meta).toHaveProperty(
      LATEST_INDEX_MAPPINGS_VERSION_META_KEY,
      1
    );
  });

  it('uses the latestMappingsVersion key name', () => {
    expect(LATEST_INDEX_MAPPINGS_VERSION_META_KEY).toEqual('latestMappingsVersion');
  });
});
