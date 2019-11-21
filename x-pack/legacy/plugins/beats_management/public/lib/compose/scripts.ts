/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { configBlockSchemas } from '../../../common/config_schemas';
import { translateConfigSchema } from '../../../common/config_schemas_translations_map';
import { RestBeatsAdapter } from '../adapters/beats/rest_beats_adapter';
import { RestConfigBlocksAdapter } from '../adapters/configuration_blocks/rest_config_blocks_adapter';
import { MemoryElasticsearchAdapter } from '../adapters/elasticsearch/memory';
import { TestingFrameworkAdapter } from '../adapters/framework/testing_framework_adapter';
import { NodeAxiosAPIAdapter } from '../adapters/rest_api/node_axios_api_adapter';
import { RestTagsAdapter } from '../adapters/tags/rest_tags_adapter';
import { RestTokensAdapter } from '../adapters/tokens/rest_tokens_adapter';
import { BeatsLib } from '../beats';
import { ConfigBlocksLib } from '../configuration_blocks';
import { ElasticsearchLib } from '../elasticsearch';
import { FrameworkLib } from '../framework';
import { TagsLib } from '../tags';
import { FrontendLibs } from '../types';

export function compose(basePath: string): FrontendLibs {
  const api = new NodeAxiosAPIAdapter('elastic', 'changeme', basePath);
  const esAdapter = new MemoryElasticsearchAdapter(
    () => true,
    () => '',
    []
  );
  const elasticsearchLib = new ElasticsearchLib(esAdapter);
  const configBlocks = new ConfigBlocksLib(
    new RestConfigBlocksAdapter(api),
    translateConfigSchema(configBlockSchemas)
  );
  const tags = new TagsLib(new RestTagsAdapter(api), elasticsearchLib);
  const tokens = new RestTokensAdapter(api);
  const beats = new BeatsLib(new RestBeatsAdapter(api), elasticsearchLib);

  const framework = new FrameworkLib(
    new TestingFrameworkAdapter(
      {
        basePath,
        license: {
          type: 'gold',
          expired: false,
          expiry_date_in_millis: 34353453452345,
        },
        security: {
          enabled: true,
          available: true,
        },
        settings: {
          encryptionKey: 'xpack_beats_default_encryptionKey',
          enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
          defaultUserRoles: ['superuser'],
        },
      },
      {
        username: 'joeuser',
        roles: ['beats_admin'],
        enabled: true,
        full_name: null,
        email: null,
      },
      '6.7.0'
    )
  );

  const libs: FrontendLibs = {
    framework,
    elasticsearch: elasticsearchLib,
    tags,
    tokens,
    beats,
    configBlocks,
  };
  return libs;
}
