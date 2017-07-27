import { kibanaUser } from './shield';

export const kibanaTestServerUrlParts = {
  protocol: process.env.TEST_KIBANA_PROTOCOL || 'http',
  hostname: process.env.TEST_KIBANA_HOSTNAME || 'localhost',
  port: parseInt(process.env.TEST_KIBANA_PORT, 10) || 5620,
  auth: kibanaUser.username + ':' + kibanaUser.password,
  username: kibanaUser.username,
  password: kibanaUser.password,
};
