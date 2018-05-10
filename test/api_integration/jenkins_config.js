export default async function ({ readConfigFile }) {
  const apiConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...apiConfig,
    esTestCluster: {
      ...apiConfig.esTestCluster,
      from: 'source',
    },
  };
}
