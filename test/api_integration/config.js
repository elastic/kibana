import {
  SupertestProvider,
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
      supertest: SupertestProvider,
      chance: ChanceProvider,
    },
    servers: commonConfig.get('servers'),
  };
}
