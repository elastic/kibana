/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import { PLUGIN } from '../../../common/constants';
import { CONFIG_PREFIX } from '../../../common/constants/plugin';
import { ElasticsearchBeatsAdapter } from '../adapters/beats/elasticsearch_beats_adapter';
import { ElasticsearchConfigurationBlockAdapter } from '../adapters/configuration_blocks/elasticsearch_configuration_block_adapter';
import { DatabaseKbnESPlugin } from '../adapters/database/adapter_types';
import { KibanaDatabaseAdapter } from '../adapters/database/kibana_database_adapter';
import { ElasticsearchBeatEventsAdapter } from '../adapters/events/elasticsearch_beat_events_adapter';
import { KibanaLegacyServer } from '../adapters/framework/adapter_types';
import { KibanaBackendFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { ElasticsearchTagsAdapter } from '../adapters/tags/elasticsearch_tags_adapter';
import { ElasticsearchTokensAdapter } from '../adapters/tokens/elasticsearch_tokens_adapter';
import { BeatEventsLib } from '../beat_events';
import { CMBeatsDomain } from '../beats';
import { ConfigurationBlocksLib } from '../configuration_blocks';
import { CMTagsDomain } from '../tags';
import { CMTokensDomain } from '../tokens';
import { CMServerLibs } from '../types';
import { BackendFrameworkLib } from './../framework';

export function compose(server: KibanaLegacyServer): CMServerLibs {
  const framework = new BackendFrameworkLib(
    new KibanaBackendFrameworkAdapter(camelCase(PLUGIN.ID), server, CONFIG_PREFIX)
  );
  const database = new KibanaDatabaseAdapter(server.plugins.elasticsearch as DatabaseKbnESPlugin);
  const beatsAdapter = new ElasticsearchBeatsAdapter(database);
  const configAdapter = new ElasticsearchConfigurationBlockAdapter(database);

  const tags = new CMTagsDomain(
    new ElasticsearchTagsAdapter(database),
    configAdapter,
    beatsAdapter
  );
  const configurationBlocks = new ConfigurationBlocksLib(configAdapter, tags);
  const tokens = new CMTokensDomain(new ElasticsearchTokensAdapter(database), {
    framework,
  });
  const beats = new CMBeatsDomain(beatsAdapter, {
    tags,
    tokens,
    framework,
  });
  const beatEvents = new BeatEventsLib(new ElasticsearchBeatEventsAdapter(database), beats);

  const libs: CMServerLibs = {
    beatEvents,
    framework,
    database,
    beats,
    tags,
    tokens,
    configurationBlocks,
  };

  return libs;
}
