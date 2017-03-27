const { Client } = require('elasticsearch');
const serverConfig = require('../../../server_config');
const pkg = require('../../../../package.json');

const client = new Client({
  host: serverConfig.servers.elasticsearch
});

class EmptyKibana {
  setup() {
    return client.index({
      index: '.kibana',
      type: 'config',
      id: pkg.version,
      body: {
        'dateFormat:tz': 'UTC'
      }
    });
  }

  teardown() {
    return client.indices.delete({ index: '.kibana' });
  }
}

const emptyKibana = new EmptyKibana();

module.exports = { client, emptyKibana };
