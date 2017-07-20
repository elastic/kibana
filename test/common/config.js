import {
  KibanaServerProvider,
  EsProvider,
  EsArchiverProvider,
} from './services';

import { esTestServerUrlParts } from '../es_test_server_url_parts';
import { kibanaTestServerUrlParts } from '../kibana_test_server_url_parts';

export default function () {
  return {
    servers: {
      kibana: kibanaTestServerUrlParts,
      elasticsearch: esTestServerUrlParts,
    },
    services: {
      kibanaServer: KibanaServerProvider,
      es: EsProvider,
      esArchiver: EsArchiverProvider,
    }
  };
}
