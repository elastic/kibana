export default async function ({ readConfigFile }) {
  const httpConfig = await readConfigFile(require.resolve('../../config'));

  return {
    testFiles: [
      require.resolve('./'),
    ],
    services: httpConfig.get('services'),
    servers: {
      ...httpConfig.get('servers'),
      kibana: {
        ...httpConfig.get('servers.kibana'),
        protocol: 'https',
      },
    },
    junit: {
      reportName: 'Http Integration Tests',
    },
    esTestCluster: httpConfig.get('esTestCluster'),
    kbnTestServer: {
      ...httpConfig.get('kbnTestServer'),
      serverArgs: [
        ...httpConfig.get('kbnTestServer.serverArgs'),
        '--server.ssl.enabled=true',
        `--server.ssl.key=${require.resolve('../../../dev_certs/server.key')}`,
        `--server.ssl.certificate=${require.resolve('../../../dev_certs/server.crt')}`,
      ],
    },
  };
}
