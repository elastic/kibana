const env = process.env;

export const kibanaUser = {
  username: env.TEST_KIBANA_USER || 'elastic',
  password: env.TEST_KIBANA_PASS || 'changeme'
};

export const kibanaServer = {
  username: env.TEST_KIBANA_SERVER_USER || 'kibana',
  password: env.TEST_KIBANA_SERVER_PASS || 'changeme'
};

export const admin = {
  username: env.TEST_ES_USER || 'elastic',
  password: env.TEST_ES_PASS || 'changeme'
};
