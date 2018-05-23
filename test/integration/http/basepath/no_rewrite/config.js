export default async function ({ readConfigFile }) {
  const httpConfig = await readConfigFile(require.resolve('../../../config'));

  return {
    services: httpConfig.get('services'),
    servers: httpConfig.get('servers'),
    junit: {
      reportName: 'Http Integration Tests',
    },
    esTestCluster: httpConfig.get('esTestCluster'),
    testFiles: [
      require.resolve('./'),
    ],
    kbnTestServer: {
      ...httpConfig.get('kbnTestServer'),
      serverArgs: [
        ...httpConfig.get('kbnTestServer.serverArgs'),
        '--server.basePath=/abc/xyz',
        '--server.rewriteBasePath=true',
      ],
    },
  };
}

