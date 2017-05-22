const shield = require('./shield');

export const esTestServerUrlParts = {
  protocol: process.env.TEST_ES_PROTOCOL || 'http',
  hostname: process.env.TEST_ES_HOSTNAME || 'localhost',
  port: parseInt(process.env.TEST_ES_PORT, 10) || 9220,
  auth: shield.admin.username + ':' + shield.admin.password,
  username: shield.admin.username,
  password: shield.admin.password,
};
