/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
// @ts-ignore not typed yet
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import 'ui/autoload/all';
import chrome from 'ui/chrome';
// @ts-ignore not typed yet
import { management } from 'ui/management';
import routes from 'ui/routes';
import { INDEX_NAMES } from '../../../common/constants/index_names';
import { RestAgentAdapter } from '../adapters/agent/rest_agent_adapter';
import { RestElasticsearchAdapter } from '../adapters/elasticsearch/rest';
import { KibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { AxiosRestAPIAdapter } from '../adapters/rest_api/axios_rest_api_adapter';
import { AgentsLib } from '../agent';
import { ElasticsearchLib } from '../elasticsearch';
import { FrontendLibs } from '../types';
import { PLUGIN } from '../../../common/constants/plugin';
import { FrameworkLib } from '../framework';

// A super early spot in kibana loading that we can use to hook before most other things
const onKibanaReady = chrome.dangerouslyGetActiveInjector;

export function compose(): FrontendLibs {
  const api = new AxiosRestAPIAdapter(chrome.getXsrfToken(), chrome.getBasePath());
  const esAdapter = new RestElasticsearchAdapter(api, INDEX_NAMES.FLEET);
  const elasticsearchLib = new ElasticsearchLib(esAdapter);
  const agents = new AgentsLib(new RestAgentAdapter(api), elasticsearchLib);

  const framework = new FrameworkLib(
    new KibanaFrameworkAdapter(
      camelCase(PLUGIN.ID),
      management,
      routes,
      chrome.getBasePath,
      onKibanaReady,
      XPackInfoProvider,
      chrome.getKibanaVersion()
    )
  );

  const libs: FrontendLibs = {
    framework,
    elasticsearch: elasticsearchLib,
    agents,
  };
  return libs;
}
