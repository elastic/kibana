import bdd from 'intern!bdd';
import serverConfig from 'intern/dojo/node!../../../server_config';
let request = require('intern/dojo/node!supertest-as-promised');
import url from 'intern/dojo/node!url';
import languages from './_languages';

bdd.describe('scripts API', function () {
  request = request(url.format(serverConfig.servers.kibana) + '/api');

  languages(bdd, request);
});
