import { kibanaUser } from './shield';
import url from 'url';

let testKibanaUrl;
let testKibanaProtocol;
let testKibanaHostname;
let testKibanaPort;
let testKibanaUsername;
let testKibanaPassword;

// Allow setting one complete TEST_KIBANA_URL for Kibana like https://elastic:changeme@myCloudInstance:5601
if (process.env.TEST_KIBANA_URL) {
  testKibanaUrl = url.parse(process.env.TEST_KIBANA_URL);
  // have to remove the ":" off protocol
  testKibanaProtocol = testKibanaUrl.protocol.slice(0, -1);
  testKibanaHostname = testKibanaUrl.hostname;
  testKibanaPort = parseInt(testKibanaUrl.port, 10);
  testKibanaUsername = testKibanaUrl.username;
  testKibanaPassword = testKibanaUrl.password;
} else {
  // Allow setting any individual component(s) of the URL,
  // or use default values (username and password from shield.js)
  testKibanaProtocol = process.env.TEST_KIBANA_PROTOCOL || 'http';
  testKibanaHostname = process.env.TEST_KIBANA_HOSTNAME || 'localhost';
  testKibanaPort = parseInt(process.env.TEST_KIBANA_PORT, 10) || 5620;
  testKibanaUsername = process.env.TEST_KIBANA_USERNAME || kibanaUser.username;
  testKibanaPassword = process.env.TEST_KIBANA_PASSWORD || kibanaUser.password;
}

export const kibanaTestServerUrlParts = {

  protocol: testKibanaProtocol,
  hostname: testKibanaHostname,
  port: testKibanaPort,
  username: testKibanaUsername,
  password: testKibanaPassword,
  auth: `${testKibanaUsername}:${testKibanaPassword}`
};
