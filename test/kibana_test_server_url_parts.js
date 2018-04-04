import { kibanaUser } from './shield';
import url from 'url';

let testKibanaUrl;
let protocol;
let hostname;
let port;
let username;
let password;


// Allow setting one complete TEST_KIBANA_URL for Kibana like https://elastic:changeme@myCloudInstance:5601
if (process.env.TEST_KIBANA_URL) {
  testKibanaUrl = url.parse(process.env.TEST_KIBANA_URL);
  // have to remove the ":" off protocol
  protocol = testKibanaUrl.protocol.slice(0, -1);
  hostname = testKibanaUrl.hostname;
  port = parseInt(testKibanaUrl.port, 10);
  username = testKibanaUrl.username;
  password = testKibanaUrl.password;
} else {
  // Allow setting any individual component(s) of the URL,
  // or use default values (username and password from shield.js)
  protocol = process.env.TEST_KIBANA_PROTOCOL || 'http';
  hostname = process.env.TEST_KIBANA_HOSTNAME || 'localhost';
  port = parseInt(process.env.TEST_KIBANA_PORT, 10) || 5620;
  username = process.env.TEST_KIBANA_USERNAME || kibanaUser.username;
  password = process.env.TEST_KIBANA_PASSWORD || kibanaUser.password;
}

export const kibanaTestServerUrlParts = {
  protocol,
  hostname,
  port,
  auth: username + ':' + password,
  username,
  password,
};
