/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import { management } from 'ui/management';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
// @ts-ignore: path dynamic for kibana
import routes from 'ui/routes';
// @ts-ignore: path dynamic for kibana
import { MemoryAgentAdapter } from '../adapters/agent/memory_agents_adapter';
import { KibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { AgentsLib } from '../agent';
import { FrameworkLib } from '../framework';
import { FrontendLibs } from '../types';
import { MemoryElasticsearchAdapter } from '../adapters/elasticsearch/memory';
import { ElasticsearchLib } from '../elasticsearch';

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

  const agents = new AgentsLib(new MemoryAgentAdapter([]), elasticsearchLib);

  const pluginUIModule = uiModules.get('app/fleet');

  const framework = new FrameworkLib(
    new KibanaFrameworkAdapter(
      pluginUIModule,
      management,
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
    agents,
  };
  return libs;
}
