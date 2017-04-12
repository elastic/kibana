import serverConfig from '../../../server_config';
import { emptyKibana } from '../lib/es';
import supertestAsPromised from 'supertest-as-promised';
import url from 'url';
import fieldCapabilities from './_field_capabilities';

describe('ingest API', () => {
  const request = supertestAsPromised(url.format(serverConfig.servers.kibana) + '/api');

  before(() => {
    return emptyKibana.setup();
  });

  after(() => {
    return emptyKibana.teardown();
  });

  fieldCapabilities(request);
});
