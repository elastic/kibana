var shield = require('./shield');

var kibanaURL = '/app/kibana';

module.exports = {
  servers: {
    webdriver: {
      protocol: process.env.TEST_UI_WEBDRIVER_PROTOCOL || 'http',
      hostname: process.env.TEST_UI_WEBDRIVER_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_UI_WEBDRIVER_PORT, 10) || 4444
    },
    kibana: {
      protocol: process.env.TEST_UI_KIBANA_PROTOCOL || 'http',
      hostname: process.env.TEST_UI_KIBANA_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_UI_KIBANA_PORT, 10) || 5620,
      auth: shield.kibanaUser.username + ':' + shield.kibanaUser.password
    },
    elasticsearch: {
      protocol: process.env.TEST_UI_ES_PROTOCOL || 'http',
      hostname: process.env.TEST_UI_ES_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_UI_ES_PORT, 10) || 9220,
      auth: shield.admin.username + ':' + shield.admin.password
    }
  },
  apps: {
    status_page: {
      pathname: 'status'
    },
    discover: {
      pathname: kibanaURL,
      hash: '/discover',
    },
    visualize: {
      pathname: kibanaURL,
      hash: '/visualize',
    },
    dashboard: {
      pathname: kibanaURL,
      hash: '/dashboard',
    },
    settings: {
      pathname: kibanaURL,
      hash: '/management'
    },
    console: {
      pathname: 'app/console',
    }
  }
};
