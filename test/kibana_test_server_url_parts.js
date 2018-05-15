import { kibanaUser } from './shield';
import url from 'url';

function getUrlParts() {
  // allow setting one complete TEST_KIBANA_URL for ES like https://elastic:changeme@example.com:9200
  if (process.env.TEST_KIBANA_URL) {
    const testKibanaUrl = url.parse(process.env.TEST_KIBANA_URL);
    return {
      protocol: testKibanaUrl.protocol.slice(0, -1),
      hostname: testKibanaUrl.hostname,
      port: parseInt(testKibanaUrl.port, 10),
      auth: testKibanaUrl.auth,
      username: testKibanaUrl.auth.split(':')[0],
      password: testKibanaUrl.auth.split(':')[1]
    };
  }

  const username = process.env.TEST_KIBANA_USERNAME || kibanaUser.username;
  const password = process.env.TEST_KIBANA_PASSWORD || kibanaUser.password;
  return {
    protocol: process.env.TEST_KIBANA_PROTOCOL || 'http',
    hostname: process.env.TEST_KIBANA_HOSTNAME || 'localhost',
    port: parseInt(process.env.TEST_KIBANA_PORT, 10) || 5620,
    auth: `${username}:${password}`,
    username,
    password,
  };
}

export const kibanaTestServerUrlParts = getUrlParts();
