import {
  KibanaSupertestProvider,
  ElasticsearchSupertestProvider,
  ChanceProvider,
} from './services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    testFiles: [
      require.resolve('./apis'),
    ],
    services: {
      es: commonConfig.get('services.es'),
      esArchiver: commonConfig.get('services.esArchiver'),
      retry: commonConfig.get('services.retry'),
      supertest: KibanaSupertestProvider,
      esSupertest: ElasticsearchSupertestProvider,
      chance: ChanceProvider,
    },
    servers: commonConfig.get('servers'),
    junit: {
      reportName: 'API Integration Tests'
    },
    env: commonConfig.get('env'),
    esTestCluster: commonConfig.get('esTestCluster'),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--optimize.enabled=false',
        '--elasticsearch.healthCheck.delay=3600000',
        '--server.xsrf.disableProtection=true',
      ],
    },
  };
}
