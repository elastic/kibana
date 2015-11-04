module.exports = {
  webdriver: {
    protocol: process.env.TEST_UI_WEBDRIVER_PROTOCOL || 'http',
    hostname: process.env.TEST_UI_WEBDRIVER_HOSTNAME || 'localhost',
    port: parseInt(process.env.TEST_UI_WEBDRIVER_PORT, 10) || 4444
  },
  kibana: {
    protocol: process.env.TEST_UI_KIBANA_PROTOCOL || 'http',
    hostname: process.env.TEST_UI_KIBANA_HOSTNAME || 'localhost',
    port: parseInt(process.env.TEST_UI_KIBANA_PORT, 10) || 5620
  },
  elasticsearch: {
    protocol: process.env.TEST_UI_ES_PROTOCOL || 'http',
    hostname: process.env.TEST_UI_ES_HOSTNAME || 'localhost',
    port: parseInt(process.env.TEST_UI_ES_PORT, 10) || 9220
  }
};
