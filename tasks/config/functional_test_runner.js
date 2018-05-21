export const functional = {
  options: {
    logLevel: 'verbose',
    configFile: require.resolve('../../test/functional/config.js')
  }
};

export const apiIntegration = {
  options: {
    logLevel: 'verbose',
    configFile: require.resolve('../../test/api_integration/config.js')
  }
};
