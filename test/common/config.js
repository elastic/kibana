import { format as formatUrl } from 'url';
import { OPTIMIZE_BUNDLE_DIR } from '../../functional_tests/lib/paths';
import {
  KibanaServerProvider,
  EsProvider,
  EsArchiverProvider,
  RetryProvider,
} from './services';

import { esTestConfig } from '../../src/test_utils/es';
import { kibanaTestServerUrlParts } from '../kibana_test_server_url_parts';

export default function () {
  return {
    servers: {
      kibana: kibanaTestServerUrlParts,
      elasticsearch: esTestConfig.getUrlParts(),
    },

    kibanaServerArgs: [
      '--env=development',
      '--logging.json=false',
      '--no-base-path',
      `--server.port=${kibanaTestServerUrlParts.port}`,
      `--optimize.watchPort=${kibanaTestServerUrlParts.port}`,
      '--optimize.watchPrebuild=true',
      '--status.allowAnonymous=true',
      '--optimize.enabled=true',
      `--optimize.bundleDir=${OPTIMIZE_BUNDLE_DIR}`,
      `--elasticsearch.url=${formatUrl(esTestConfig.getUrlParts())}`,
      `--elasticsearch.username=${esTestConfig.getUrlParts().username}`,
      `--elasticsearch.password=${esTestConfig.getUrlParts().password}`,
    ],

    services: {
      kibanaServer: KibanaServerProvider,
      retry: RetryProvider,
      es: EsProvider,
      esArchiver: EsArchiverProvider,
    }
  };
}
