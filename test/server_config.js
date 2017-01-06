import url from 'url';
import shield from './shield';

const KIBANA_BASE_PATH = '/app/kibana';
const TEST_KIBANA_URL = url.parse(process.env.TEST_KIBANA ? process.env.TEST_KIBANA : 'http://localhost:5620');
const TEST_ES_URL = url.parse(process.env.TEST_ES ? process.env.TEST_ES : 'http://localhost:9220');
const TEST_KIBANA_USERNAME = TEST_KIBANA_URL.username || shield.kibanaUser.username;
const TEST_KIBANA_PASSWORD = TEST_KIBANA_URL.password || shield.kibanaUser.password;
const TEST_ES_USERNAME = TEST_ES_URL.username || shield.admin.username;
const TEST_ES_PASSWORD = TEST_ES_URL.password || shield.admin.password;

module.exports = {
  servers: {
    webdriver: {
      protocol: process.env.TEST_WEBDRIVER_PROTOCOL || 'http',
      hostname: process.env.TEST_WEBDRIVER_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_WEBDRIVER_PORT, 10) || 4444
    },
    kibana: {
      protocol: process.env.TEST_KIBANA_PROTOCOL || TEST_KIBANA_URL.protocol,
      hostname: process.env.TEST_KIBANA_HOSTNAME || TEST_KIBANA_URL.hostname,
      port: parseInt(process.env.TEST_KIBANA_PORT, 10) || parseInt(TEST_KIBANA_URL.port, 10),
      username: TEST_KIBANA_USERNAME,
      password: TEST_KIBANA_PASSWORD,
      auth: `${TEST_KIBANA_USERNAME}:${TEST_KIBANA_PASSWORD}`
    },
    elasticsearch: {
      protocol: process.env.TEST_ES_PROTOCOL || TEST_ES_URL.protocol,
      hostname: process.env.TEST_ES_HOSTNAME || TEST_ES_URL.hostname,
      port: parseInt(process.env.TEST_ES_PORT, 10) || parseInt(TEST_ES_URL.port, 10),
      username: TEST_ES_USERNAME,
      password: TEST_ES_PASSWORD,
      auth: `${TEST_ES_USERNAME}:${TEST_ES_PASSWORD}`
    }
  },
  apps: {
    status_page: {
      pathname: 'status'
    },
    discover: {
      pathname: KIBANA_BASE_PATH,
      hash: '/discover',
    },
    visualize: {
      pathname: KIBANA_BASE_PATH,
      hash: '/visualize',
    },
    dashboard: {
      pathname: KIBANA_BASE_PATH,
      hash: '/dashboard',
    },
    settings: {
      pathname: KIBANA_BASE_PATH,
      hash: '/management'
    },
    console: {
      pathname: KIBANA_BASE_PATH,
      hash: '/dev_tools/console',
    }
  }
};
