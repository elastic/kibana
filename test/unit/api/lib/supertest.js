import { format as formatUrl } from 'url';

import supertestAsPromised from 'supertest-as-promised';

import serverConfig from '../../../server_config';

export const supertest = supertestAsPromised(
  formatUrl({
    ...serverConfig.servers.kibana,
    pathname: '/api',
  })
);
