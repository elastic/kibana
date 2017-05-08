import expect from 'expect.js';

import { SavedObjectsClient } from '../saved_objects_client';

const BASE_PATH = 'http://localhost:5601/basepath';
const API_URL = `${BASE_PATH}/api/kibana/saved_objects`;

describe('SavedObjectsClient', () => {
  const setup = ($http) => {
    return new SavedObjectsClient($http, BASE_PATH);
  };

  it('returns response data', async () => {
    const data = {};
    const client = setup(params => {
      expect(params).to.have.property('method', 'GET');
      expect(params).to.have.property('url', `${API_URL}/index-pattern/logstash-*`);
      return Promise.resolve({ data });
    });

    const resp = await client.get('index-pattern', 'logstash-*');
    expect(resp).to.be(data);
  });
});
