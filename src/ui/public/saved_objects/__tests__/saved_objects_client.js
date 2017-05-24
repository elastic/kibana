import sinon from 'sinon';
import expect from 'expect.js';
import { SavedObjectsClient } from '../saved_objects_client';
import { SavedObject } from '../saved_object';

describe('SavedObjectsClient', () => {
  const basePath = Math.random().toString(36).substring(7);
  const sandbox = sinon.sandbox.create();
  const doc = {
    id: 'AVwSwFxtcMV38qjDZoQg',
    type: 'config',
    attributes: { title: 'Example title' }
  };

  let savedObjectsClient;
  let $http;

  beforeEach(() => {
    $http = sandbox.stub().returns(Promise.resolve({}));
    savedObjectsClient = new SavedObjectsClient($http, basePath);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#_getUrl', () => {
    it('returns without arguments', () => {
      const url = savedObjectsClient._getUrl();
      const expected = `${basePath}/api/saved_objects/`;

      expect(url).to.be(expected);
    });

    it('appends path', () => {
      const url = savedObjectsClient._getUrl(['some', 'path']);
      const expected = `${basePath}/api/saved_objects/some/path`;

      expect(url).to.be(expected);
    });

    it('appends query', () => {
      const url = savedObjectsClient._getUrl(['some', 'path'], { foo: 'Foo', bar: 'Bar' });
      const expected = `${basePath}/api/saved_objects/some/path?foo=Foo&bar=Bar`;

      expect(url).to.be(expected);
    });
  });

  describe('#_request', () => {
    const params = { foo: 'Foo', bar: 'Bar' };

    it('passes options to $http', () => {
      $http.withArgs({
        method: 'POST',
        url: '/api/path',
        data: params
      }).returns(Promise.resolve({ data: '' }));

      savedObjectsClient._request('POST', '/api/path', params);

      expect($http.calledOnce).to.be(true);
    });

    it('throws error when body is provided for GET', async () => {
      try {
        await savedObjectsClient._request('GET', '/api/path', params);
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.eql('body not permitted for GET requests');
      }
    });

    it('catches API error', async () => {
      const message = 'Request failed';
      $http.returns(Promise.reject({ data: { error: message } }));

      try {
        await savedObjectsClient._request('POST', '/api/path', params);
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.eql(message);
      }
    });

    it('catches API error status', async () => {
      $http.returns(Promise.reject({ status: 404 }));

      try {
        await savedObjectsClient._request('POST', '/api/path', params);
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.eql('404 Response');
      }
    });
  });

  describe('#get', () => {
    beforeEach(() => {
      $http.withArgs({
        method: 'GET',
        url: `${basePath}/api/saved_objects/index-pattern/logstash-*`,
        data: undefined
      }).returns(Promise.resolve({ data: doc }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.get('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    it('requires type', async () => {
      try {
        await savedObjectsClient.get();
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    it('requires id', async () => {
      try {
        await savedObjectsClient.get('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    it('resolves with instantiated SavedObject', async () => {
      const response = await savedObjectsClient.get('index-pattern', 'logstash-*');
      expect(response).to.be.a(SavedObject);
      expect(response.type).to.eql('config');
      expect(response.get('title')).to.eql('Example title');
      expect(response._client).to.be.a(SavedObjectsClient);
    });

    it('makes HTTP call', () => {
      savedObjectsClient.get('index-pattern', 'logstash-*');
      sinon.assert.calledOnce($http);
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      $http.withArgs({
        method: 'DELETE',
        url: `${basePath}/api/saved_objects/index-pattern/logstash-*`
      }).returns(Promise.resolve({ data: 'api-response' }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.delete('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    it('requires type', async () => {
      try {
        await savedObjectsClient.delete();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    it('requires id', async () => {
      try {
        await savedObjectsClient.delete('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    it('makes HTTP call', () => {
      savedObjectsClient.delete('index-pattern', 'logstash-*');
      sinon.assert.calledOnce($http);
    });
  });

  describe('#update', () => {
    const requireMessage = 'requires type, id and attributes';

    beforeEach(() => {
      $http.withArgs({
        method: 'PUT',
        url: `${basePath}/api/saved_objects/index-pattern/logstash-*`,
        data: sinon.match.any
      }).returns(Promise.resolve({ data: 'api-response' }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.update('index-pattern', 'logstash-*', {})).to.be.a(Promise);
    });

    it('requires type', async () => {
      try {
        await savedObjectsClient.update();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('requires id', async () => {
      try {
        await savedObjectsClient.update('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('requires attributes', async () => {
      try {
        await savedObjectsClient.update('index-pattern', 'logstash-*');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('makes HTTP call', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      const body = { attributes, version: 2 };
      const options = { version: 2 };

      savedObjectsClient.update('index-pattern', 'logstash-*', attributes, options);
      sinon.assert.calledOnce($http);

      expect($http.getCall(0).args[0].data).to.eql(body);
    });
  });

  describe('#create', () => {
    const requireMessage = 'requires type and body';

    beforeEach(() => {
      $http.withArgs({
        method: 'POST',
        url: `${basePath}/api/saved_objects/index-pattern`,
        data: sinon.match.any
      }).returns(Promise.resolve({ data: 'api-response' }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.create('index-pattern', {})).to.be.a(Promise);
    });

    it('requires type', async () => {
      try {
        await savedObjectsClient.create();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('requires body', async () => {
      try {
        await savedObjectsClient.create('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    it('makes HTTP call', () => {
      const body = { foo: 'Foo', bar: 'Bar', id: 'logstash-*' };
      savedObjectsClient.create('index-pattern', body);

      sinon.assert.calledOnce($http);
      expect($http.getCall(0).args[0].data).to.eql(body);
    });
  });

  describe('#find', () => {
    const object = { id: 'logstash-*', type: 'index-pattern', title: 'Test' };

    beforeEach(() => {
      $http.returns(Promise.resolve({ data: { saved_objects: [object] } }));
    });

    it('returns a promise', () => {
      expect(savedObjectsClient.find()).to.be.a(Promise);
    });

    it('accepts type', () => {
      const body = { type: 'index-pattern', invalid: true };

      savedObjectsClient.find(body);
      expect($http.calledOnce).to.be(true);

      const options = $http.getCall(0).args[0];
      expect(options.url).to.eql(`${basePath}/api/saved_objects/index-pattern?type=index-pattern&invalid=true`);
    });

    it('accepts fields', () => {
      const body = { fields: ['title', 'description'] };

      savedObjectsClient.find(body);
      expect($http.calledOnce).to.be(true);

      const options = $http.getCall(0).args[0];
      expect(options.url).to.eql(`${basePath}/api/saved_objects/?fields=title&fields=description`);
    });

    it('accepts from/size', () => {
      const body = { from: 50, size: 10 };

      savedObjectsClient.find(body);
      expect($http.calledOnce).to.be(true);

      const options = $http.getCall(0).args[0];
      expect(options.url).to.eql(`${basePath}/api/saved_objects/?from=50&size=10`);

    });
  });
});
