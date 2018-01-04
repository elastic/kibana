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
    services: {
      kibanaServer: KibanaServerProvider,
      retry: RetryProvider,
      es: EsProvider,
      esArchiver: EsArchiverProvider,
    }
  };
}
