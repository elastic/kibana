export const functional = {
  options: {
    logLevel: 'debug',
    configFile: require.resolve('../../test/functional/config.js')
  }
};

export const apiIntegration = {
  options: {
    logLevel: 'debug',
    configFile: require.resolve('../../test/api_integration/config.js')
  }
};
