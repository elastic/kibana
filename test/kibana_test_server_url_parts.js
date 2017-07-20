const shield = require('./shield');

export const kibanaTestServerUrlParts = {
  protocol: process.env.TEST_KIBANA_PROTOCOL || 'http',
  hostname: process.env.TEST_KIBANA_HOSTNAME || 'localhost',
  port: parseInt(process.env.TEST_KIBANA_PORT, 10) || 5620,
  auth: shield.kibanaUser.username + ':' + shield.kibanaUser.password,
  username: shield.kibanaUser.username,
  password: shield.kibanaUser.password,
};
