//export async function runIntegrationTests({ readConfigFile }) {
export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));
  const kibanaAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.js'));

  return {
    // TODO: including testFiles like this isn't really going to work.
    // we need a way to run each kind with its own server setup
    // and teardown.
    testFiles: [
      // nb: start with assuming only one simple setup
      require.resolve('./with-ssl/index.js'),
      // require.resolve('./with-basepath/index.js'),
      // require.resolve('./without-basepath/index.js'),
    ],
    servers: commonConfig.get('servers'),
    services: {
      es: commonConfig.get('services.es'),
      esArchiver: commonConfig.get('services.esArchiver'),
      retry: commonConfig.get('services.retry'),
      supertest: kibanaAPITestsConfig.get('services.supertest'),
      chance: kibanaAPITestsConfig.get('services.chance'),
    },
    junit: {
      reportName: 'Integration Tests'
    }
  };
}

