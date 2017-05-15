import sinon from 'sinon';
import expect from 'expect.js';
import { pick } from 'lodash';
import { SavedObjectsClient } from '../saved_objects_client';
import { SavedObject } from '../saved_object';


describe('SavedObjectsClient', () => {
  const basePath = Math.random().toString(36).substring(7);
  const sandbox = sinon.sandbox.create();

  let savedObjectsClient;

  beforeEach(() => {
    savedObjectsClient = new SavedObjectsClient(sinon.stub, basePath);
    sandbox.stub(savedObjectsClient, '_$http');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#_getUrl', () => {
    it('returns without arguments', () => {
      const url = savedObjectsClient._getUrl();
      const expected = `${basePath}/api/kibana/saved_objects/`;

      expect(url).to.be(expected);
    });

    it('appends path', () => {
      const url = savedObjectsClient._getUrl(['some', 'path']);
      const expected = `${basePath}/api/kibana/saved_objects/some/path`;

      expect(url).to.be(expected);
    });

    it('appends query', () => {
      const url = savedObjectsClient._getUrl(['some', 'path'], { foo: 'Foo', bar: 'Bar' });
      const expected = `${basePath}/api/kibana/saved_objects/some/path?foo=Foo&bar=Bar`;

      expect(url).to.be(expected);
    });
  });

  describe('#_request', () => {
    const params = { foo: 'Foo', bar: 'Bar' };

    it('passes options to $http', () => {
      savedObjectsClient._$http.withArgs({
        method: 'POST',
        url: '/api/path',
        data: params
      }).returns(Promise.resolve({ data: '' }));

      savedObjectsClient._request('POST', '/api/path', params);

      expect(savedObjectsClient._$http.calledOnce).to.be(true);
    });

    it('sets params for GET request', () => {
      savedObjectsClient._$http.withArgs({
        method: 'GET',
        url: '/api/path',
        params: params
      }).returns(Promise.resolve({ data: '' }));

      savedObjectsClient._request('GET', '/api/path', params);

      expect(savedObjectsClient._$http.calledOnce).to.be(true);
    });

    it('catches API error', (done) => {
      const message = 'Request failed';

      savedObjectsClient._$http.returns(Promise.reject({ data: { error: message } }));
      savedObjectsClient._request('GET', '/api/path', params).then(() => {
        done('should have thrown');
      }).catch(e => {
        expect(e.message).to.eql(message);
        done();
      });
    });

    it('catches API error message', (done) => {
      const message = 'Request failed';

      savedObjectsClient._$http.returns(Promise.reject({ data: { message: message } }));
      savedObjectsClient._request('GET', '/api/path', params).then(() => {
        done('should have thrown');
      }).catch(e => {
        expect(e.message).to.eql(message);
        done();
      });
    });

    it('catches API error status', (done) => {
      savedObjectsClient._$http.returns(Promise.reject({ status: 404 }));
      savedObjectsClient._request('GET', '/api/path', params).then(() => {
        done('should have thrown');
      }).catch(e => {
        expect(e.message).to.eql('404 Response');
        done();
      });
    });
  });

  describe('#get', () => {
    const attributes = { type: 'index-pattern', foo: 'Foo' };

    beforeEach(() => {
      savedObjectsClient._$http.withArgs({
        method: 'GET',
        url: `${basePath}/api/kibana/saved_objects/index-pattern/logstash-*`
      }).returns(Promise.resolve(attributes));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.get('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    it('requires type', (done) => {
      savedObjectsClient.get().then(() => {
        done('should require type');
      }).catch((e) => {
        expect(e.message).to.contain('requires type and id');
        done();
      });
    });

    it('requires id', (done) => {
      savedObjectsClient.get('index-pattern').then(() => {
        done('should require id');
      }).catch((e) => {
        expect(e.message).to.contain('requires type and id');
        done();
      });
    });

    it('resolves with instantiated ObjectClass', async () => {
      const response = await savedObjectsClient.get('index-pattern', 'logstash-*');
      expect(response).to.be.a(SavedObject);
      expect(response.attributes).to.eql(attributes);
      expect(response.client).to.be.a(SavedObjectsClient);
    });

    it('makes HTTP call', () => {
      savedObjectsClient.get('index-pattern', 'logstash-*');
      sinon.assert.calledOnce(savedObjectsClient._$http);
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      savedObjectsClient._$http.withArgs({
        method: 'DELETE',
        url: `${basePath}/api/kibana/saved_objects/index-pattern/logstash-*`
      }).returns(Promise.resolve({ data: 'api-response' }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.delete('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    it('requires type', (done) => {
      savedObjectsClient.delete().then(() => {
        done('should require type');
      }).catch((e) => {
        expect(e.message).to.contain('requires type and id');
        done();
      });
    });

    it('requires id', (done) => {
      savedObjectsClient.delete('index-pattern').then(() => {
        done('should require id');
      }).catch((e) => {
        expect(e.message).to.contain('requires type and id');
        done();
      });
    });

    it('makes HTTP call', () => {
      savedObjectsClient.delete('index-pattern', 'logstash-*');
      sinon.assert.calledOnce(savedObjectsClient._$http);
    });
  });

  describe('#update', () => {
    const requireMessage = 'requires type, id and body';

    beforeEach(() => {
      savedObjectsClient._$http.withArgs({
        method: 'PUT',
        url: `${basePath}/api/kibana/saved_objects/index-pattern/logstash-*`,
        data: sinon.match.any
      }).returns(Promise.resolve({ data: 'api-response' }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.update('index-pattern', 'logstash-*', {})).to.be.a(Promise);
    });

    it('requires type', (done) => {
      savedObjectsClient.update().then(() => {
        done('should require type');
      }).catch((e) => {
        expect(e.message).to.contain(requireMessage);
        done();
      });
    });

    it('requires id', (done) => {
      savedObjectsClient.update('index-pattern').then(() => {
        done('should require id');
      }).catch((e) => {
        expect(e.message).to.contain(requireMessage);
        done();
      });
    });

    it('requires body', (done) => {
      savedObjectsClient.update('index-pattern', 'logstash-*').then(() => {
        done('should require body');
      }).catch((e) => {
        expect(e.message).to.contain(requireMessage);
        done();
      });
    });

    it('makes HTTP call', () => {
      const body = { foo: 'Foo', bar: 'Bar' };

      savedObjectsClient.update('index-pattern', 'logstash-*', body);
      sinon.assert.calledOnce(savedObjectsClient._$http);

      expect(savedObjectsClient._$http.getCall(0).args[0].data).to.eql(body);
    });
  });

  describe('#create', () => {
    const requireMessage = 'requires type and body';

    beforeEach(() => {
      savedObjectsClient._$http.withArgs({
        method: 'POST',
        url: `${basePath}/api/kibana/saved_objects/index-pattern`,
        data: sinon.match.any
      }).returns(Promise.resolve({ data: 'api-response' }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.create('index-pattern', {})).to.be.a(Promise);
    });

    it('requires type', (done) => {
      savedObjectsClient.create().then(() => {
        done('should require type');
      }).catch((e) => {
        expect(e.message).to.contain(requireMessage);
        done();
      });
    });

    it('requires body', (done) => {
      savedObjectsClient.create('index-pattern').then(() => {
        done('should require body');
      }).catch((e) => {
        expect(e.message).to.contain(requireMessage);
        done();
      });
    });

    it('makes HTTP call', () => {
      const body = { foo: 'Foo', bar: 'Bar', id: 'logstash-*' };
      savedObjectsClient.create('index-pattern', body);

      sinon.assert.calledOnce(savedObjectsClient._$http);
      expect(savedObjectsClient._$http.getCall(0).args[0].data).to.eql(body);
    });
  });

  describe('#find', () => {
    const object = { id: 'logstash-*', type: 'index-pattern', title: 'Test' };

    beforeEach(() => {
      savedObjectsClient._$http.returns(Promise.resolve({ data: [object] }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.find()).to.be.a(Promise);
    });

    it('accepts type', () => {
      const body = { type: 'index-pattern', invalid: true };

      savedObjectsClient.find(body);
      expect(savedObjectsClient._$http.calledOnce).to.be(true);

      const options = savedObjectsClient._$http.getCall(0).args[0];
      expect(options.url).to.eql(`${basePath}/api/kibana/saved_objects/index-pattern`);
    });

    it('accepts fields', () => {
      const body = { fields: ['title', 'description'], invalid: true };

      savedObjectsClient.find(body);
      expect(savedObjectsClient._$http.calledOnce).to.be(true);

      const options = savedObjectsClient._$http.getCall(0).args[0];
      expect(options.params).to.eql(pick(body, ['fields']));
    });

    it('accepts from/size', () => {
      const body = { from: 50, size: 10, invalid: true };

      savedObjectsClient.find(body);
      expect(savedObjectsClient._$http.calledOnce).to.be(true);

      const options = savedObjectsClient._$http.getCall(0).args[0];
      expect(options.params).to.eql(pick(body, ['from', 'size']));
    });
  });
});
