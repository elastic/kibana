/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
// @ts-ignore: path dynamic for kibana
import routes from 'ui/routes';
import { npStart } from 'ui/new_platform';
import { configBlockSchemas } from '../../../common/config_schemas';
import { translateConfigSchema } from '../../../common/config_schemas_translations_map';
// @ts-ignore: path dynamic for kibana
import { MemoryBeatsAdapter } from '../adapters/beats/memory_beats_adapter';
import { KibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { MemoryTagsAdapter } from '../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../adapters/tokens/memory_tokens_adapter';
import { BeatsLib } from '../beats';
import { ConfigBlocksLib } from '../configuration_blocks';
import { FrameworkLib } from '../framework';
import { TagsLib } from '../tags';
import { FrontendLibs } from '../types';
import { MemoryElasticsearchAdapter } from './../adapters/elasticsearch/memory';
import { ElasticsearchLib } from './../elasticsearch';
import { AutocompleteSuggestion } from '../../../../../../../src/plugins/data/public';

const onKibanaReady = uiModules.get('kibana').run;

export function compose(
  mockIsKueryValid: (kuery: string) => boolean,
  mockKueryToEsQuery: (kuery: string) => string,
  suggestions: AutocompleteSuggestion[]
): FrontendLibs {
  const esAdapter = new MemoryElasticsearchAdapter(
    mockIsKueryValid,
    mockKueryToEsQuery,
    suggestions
  );
  const elasticsearchLib = new ElasticsearchLib(esAdapter);

  const configBlocks = new ConfigBlocksLib({} as any, translateConfigSchema(configBlockSchemas));
  const tags = new TagsLib(new MemoryTagsAdapter([]), elasticsearchLib);
  const tokens = new MemoryTokensAdapter();
  const beats = new BeatsLib(new MemoryBeatsAdapter([]), elasticsearchLib);

  const pluginUIModule = uiModules.get('app/beats_management');

  const framework = new FrameworkLib(
    new KibanaFrameworkAdapter(
      pluginUIModule,
      // @ts-ignore
      npStart.plugins.management.legacy,
      routes,
      () => '',
      onKibanaReady,
      null,
      '7.0.0'
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
