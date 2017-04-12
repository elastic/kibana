import expect from 'expect.js';
import { client, emptyKibana } from '../lib/es';

export default function (request) {
  describe('field_capabilities API', function postIngest() {

    before(() => {
      return client.create({
        index: 'foo-1',
        type: 'bar',
        id: '1',
        body: {
          foo: 'bar'
        }
      })
      .then(() => {
        return client.create({
          index: 'foo-2',
          type: 'bar',
          id: '2',
          body: {
            baz: 'bar'
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

    it('should return searchable/aggregatable flags for fields in the indices specified', () => {
      return request.get('/kibana/foo-1/field_capabilities')
      .expect(200)
      .then((response) => {
        const fields = response.body.fields;
        expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
        expect(fields['foo.keyword']).to.eql({ searchable: true, aggregatable: true });
        expect(fields).to.not.have.property('baz');
      });
    });

    it('should accept wildcards in the index name', () => {
      return request.get('/kibana/foo-*/field_capabilities')
      .expect(200)
      .then((response) => {
        const fields = response.body.fields;
        expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
        expect(fields.baz).to.eql({ searchable: true, aggregatable: false });
      });
    });

    it('should accept comma delimited lists of indices', () => {
      return request.get('/kibana/foo-1,foo-2/field_capabilities')
      .expect(200)
      .then((response) => {
        const fields = response.body.fields;
        expect(fields.foo).to.eql({ searchable: true, aggregatable: false });
        expect(fields.baz).to.eql({ searchable: true, aggregatable: false });
      });
    });

    it('should return 404 if a pattern matches no indices', () => {
      return request.post('/kibana/doesnotexist-*/field_capabilities')
      .expect(404);
    });

    it('should return 404 if a concrete index does not exist', () => {
      return request.post('/kibana/concrete/field_capabilities')
      .expect(404);
    });

  });
}
