// import {
// SupertestProvider,
// ChanceProvider,
// } from './services';

export async function runIntegrationTests({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));

  return {
    // TODO: including testFiles like this isn't really going to work.
    // we need a way to run each kind with its own server setup
    // and teardown.
    testFiles: [
      require.resolve('./with-basepath/index.js'),
      require.resolve('./without-basepath/index.js'),
      require.resolve('./with-ssl/index.js'),
    ],
    services: {
      es: commonConfig.get('services.es'),
      esArchiver: commonConfig.get('services.esArchiver'),
      retry: commonConfig.get('services.retry'),
      // TODO: determine if these are needed
      // supertest: SupertestProvider,
      // chance: ChanceProvider,
    },
    servers: commonConfig.get('servers'),
    junit: {
      reportName: 'Integration Tests'
    }
  };
}

