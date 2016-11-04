const env = process.env;

exports.kibanaUser = {
  username: env.SHIELD_KIBANA_USER || 'user',
  password: env.SHIELD_KIBANA_USER_PASS || 'notsecure'
};

exports.kibanaServer = {
  username: env.SHIELD_KIBANA_SERVER || 'kibana',
  password: env.SHIELD_KIBANA_SERVER_PASS || 'notsecure'
};

exports.admin = {
  username: env.SHIELD_ADMIN || 'admin',
  password: env.SHIELD_ADMIN_PASS || 'notsecure'
};
