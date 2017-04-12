import expect from 'expect.js';
import { client, emptyKibana } from '../lib/es';

export default function (request) {
  describe('Count API', function postIngest() {

    before(() => {
      return client.index({
        index: 'foo-1',
        type: 'bar',
        id: '1',
        body: {
          foo: 'bar'
        }
      })
      .then(() => {
        return client.index({
          index: 'foo-2',
          type: 'bar',
          id: '2',
          body: {
            foo: 'bar'
          }
        });
      })
      .then(() => {
        return client.indices.refresh({
          index: ['foo-1', 'foo-2']
        });
      });
    });

    after(() => {
      return emptyKibana.setup().then(() => {
        return client.indices.delete({
          index: 'foo*'
        });
      });
    });

    it('should return 200 with a document count for existing indices', () => {
      return request.post('/kibana/foo-*/_count')
      .expect(200)
      .then((response) => {
        expect(response.body.count).to.be(2);
      });
    });

    it('should support GET requests as well', () => {
      return request.get('/kibana/foo-*/_count')
      .expect(200)
      .then((response) => {
        expect(response.body.count).to.be(2);
      });
    });

    it('should return 404 if a pattern matches no indices', () => {
      return request.post('/kibana/doesnotexist-*/_count')
      .expect(404);
    });

    it('should return 404 if a concrete index does not exist', () => {
      return request.post('/kibana/concrete/_count')
      .expect(404);
    });

  });
}
