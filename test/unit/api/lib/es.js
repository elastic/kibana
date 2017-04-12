import { Client } from 'elasticsearch';
import serverConfig from '../../../server_config';
import pkg from '../../../../package.json';

export const client = new Client({
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

export const emptyKibana = new EmptyKibana();
