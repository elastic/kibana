const env = process.env;

exports.kibanaUser = {
  username: env.TEST_KIBANA_USER || 'elastic',
  password: env.TEST_KIBANA_PASS || 'changeme'
};

exports.kibanaServer = {
  username: env.TEST_KIBANA_SERVER_USER || 'kibana',
  password: env.TEST_KIBANA_SERVER_PASS || 'changeme'
};

exports.admin = {
  username: env.TEST_ES_USER || 'elastic',
  password: env.TEST_ES_PASS || 'changeme'
};
