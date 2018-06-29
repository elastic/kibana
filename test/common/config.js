import { format as formatUrl } from 'url';
import { OPTIMIZE_BUNDLE_DIR, esTestConfig, kbnTestConfig } from '@kbn/test';
import {
  KibanaServerProvider,
  EsProvider,
  EsArchiverProvider,
  RetryProvider,
} from './services';

export default function () {
  const servers = {
    kibana: kbnTestConfig.getUrlParts(),
    elasticsearch: esTestConfig.getUrlParts(),
  };

  return {
    servers,

    esTestCluster: {
      license: 'oss',
      from: 'snapshot',
      serverArgs: [
      ],
    },

    kbnTestServer: {
      buildArgs: [ '--optimize.useBundleCache=true' ],
      sourceArgs: [
        '--no-base-path',
        `--optimize.bundleDir=${OPTIMIZE_BUNDLE_DIR}`,
      ],
      serverArgs: [
        '--env.name=development',
        '--logging.json=false',
        `--server.port=${kbnTestConfig.getPort()}`,
        `--optimize.watchPort=${kbnTestConfig.getPort() + 10}`,
        '--optimize.watchPrebuild=true',
        '--status.allowAnonymous=true',
        '--optimize.enabled=true',
        `--elasticsearch.url=${formatUrl(servers.elasticsearch)}`,
        `--elasticsearch.username=${servers.elasticsearch.username}`,
        `--elasticsearch.password=${servers.elasticsearch.password}`,
      ],
    },

    services: {
      kibanaServer: KibanaServerProvider,
      retry: RetryProvider,
      es: EsProvider,
      esArchiver: EsArchiverProvider,
    }
  };
}
