const env = process.env;

exports.kibanaUser = {
  username: env.SHIELD_KIBANA_USER || 'elastic',
  password: env.SHIELD_KIBANA_USER_PASS || 'changeme'
};

exports.kibanaServer = {
  username: env.SHIELD_KIBANA_SERVER || 'elastic',
  password: env.SHIELD_KIBANA_SERVER_PASS || 'changeme'
};

exports.admin = {
  username: env.SHIELD_ADMIN || 'elastic',
  password: env.SHIELD_ADMIN_PASS || 'changeme'
};
