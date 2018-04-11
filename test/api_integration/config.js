import {
  KibanaSupertestProvider,
  KibanaSupertestWithoutAuthProvider,
  ElasticsearchSupertestProvider,
  ChanceProvider,
} from './services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));

  return {
    testFiles: [
      require.resolve('./apis'),
    ],
    services: {
      es: commonConfig.get('services.es'),
      esArchiver: commonConfig.get('services.esArchiver'),
      retry: commonConfig.get('services.retry'),
      supertest: KibanaSupertestProvider,
      supertestWithoutAuth: KibanaSupertestWithoutAuthProvider,
      esSupertest: ElasticsearchSupertestProvider,
      chance: ChanceProvider,
    },
    servers: commonConfig.get('servers'),
    junit: {
      reportName: 'API Integration Tests'
    },
    kibanaServerArgs: [
      ...commonConfig.get('kibanaServerArgs'),
      '--optimize.enabled=false',
      '--elasticsearch.healthCheck.delay=3600000',
      '--server.xsrf.disableProtection=true',
    ],
  };
}
