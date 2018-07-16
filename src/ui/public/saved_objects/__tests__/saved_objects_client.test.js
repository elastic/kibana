/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('ui/kfetch', () => ({}));

import sinon from 'sinon';
import expect from 'expect.js';
import { SavedObjectsClient } from '../saved_objects_client';
import { SavedObject } from '../saved_object';

describe('SavedObjectsClient', () => {
  const doc = {
    id: 'AVwSwFxtcMV38qjDZoQg',
    type: 'config',
    attributes: { title: 'Example title' },
    version: 2
  };

  let kfetchStub;
  let savedObjectsClient;
  beforeEach(() => {
    kfetchStub = sinon.stub();
    require('ui/kfetch').kfetch = async (...args) => {
      return kfetchStub(...args);
    };
    savedObjectsClient = new SavedObjectsClient();
  });

  describe('#_getPath', () => {
    test('returns without arguments', () => {
      const path = savedObjectsClient._getPath();
      const expected = `/api/saved_objects/`;

      expect(path).to.be(expected);
    });

    test('appends path', () => {
      const path = savedObjectsClient._getPath(['some', 'path']);
      const expected = `/api/saved_objects/some/path`;

      expect(path).to.be(expected);
    });
  });

  describe('#_request', () => {
    const body = { foo: 'Foo', bar: 'Bar' };

    test('passes options to kfetch', () => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: '/api/path',
        query: undefined,
        body: JSON.stringify(body)
      }).returns(Promise.resolve({}));

      savedObjectsClient._request({ method: 'POST', path: '/api/path', body });

      sinon.assert.calledOnce(kfetchStub);
    });

    test('throws error when body is provided for GET', async () => {
      try {
        await savedObjectsClient._request({ method: 'GET', path: '/api/path', body });
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.eql('body not permitted for GET requests');
      }
    });
  });

  describe('#get', () => {
    beforeEach(() => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/saved_objects/_bulk_get`,
        query: undefined,
        body: sinon.match.any
      }).returns(Promise.resolve({ saved_objects: [doc] }));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.get('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    test('requires type', async () => {
      try {
        await savedObjectsClient.get();
        expect().fail('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    test('requires id', async () => {
      try {
        await savedObjectsClient.get('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    test('resolves with instantiated SavedObject', async () => {
      const response = await savedObjectsClient.get(doc.type, doc.id);
      expect(response).to.be.a(SavedObject);
      expect(response.type).to.eql('config');
      expect(response.get('title')).to.eql('Example title');
      expect(response._client).to.be.a(SavedObjectsClient);
    });

    test('makes HTTP call', async () => {
      await savedObjectsClient.get(doc.type, doc.id);
      sinon.assert.calledOnce(kfetchStub);
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      kfetchStub.withArgs({
        method: 'DELETE',
        pathname: `/api/saved_objects/index-pattern/logstash-*`,
        query: undefined,
        body: undefined,
      }).returns(Promise.resolve({}));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.delete('index-pattern', 'logstash-*')).to.be.a(Promise);
    });

    test('requires type', async () => {
      try {
        await savedObjectsClient.delete();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    test('requires id', async () => {
      try {
        await savedObjectsClient.delete('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be('requires type and id');
      }
    });

    test('makes HTTP call', () => {
      savedObjectsClient.delete('index-pattern', 'logstash-*');
      sinon.assert.calledOnce(kfetchStub);
    });
  });

  describe('#update', () => {
    const requireMessage = 'requires type, id and attributes';

    beforeEach(() => {
      kfetchStub.withArgs({
        method: 'PUT',
        pathname: `/api/saved_objects/index-pattern/logstash-*`,
        query: undefined,
        body: sinon.match.any
      }).returns(Promise.resolve({ data: 'api-response' }));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.update('index-pattern', 'logstash-*', {})).to.be.a(Promise);
    });

    test('requires type', async () => {
      try {
        await savedObjectsClient.update();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    test('requires id', async () => {
      try {
        await savedObjectsClient.update('index-pattern');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    test('requires attributes', async () => {
      try {
        await savedObjectsClient.update('index-pattern', 'logstash-*');
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    test('makes HTTP call', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      const body = { attributes, version: 2 };
      const options = { version: 2 };

      savedObjectsClient.update('index-pattern', 'logstash-*', attributes, options);
      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(kfetchStub, sinon.match({
        body: JSON.stringify(body)
      }));
    });
  });

  describe('#create', () => {
    const requireMessage = 'requires type and attributes';

    beforeEach(() => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/saved_objects/index-pattern`,
        query: undefined,
        body: sinon.match.any
      }).returns(Promise.resolve({}));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.create('index-pattern', {})).to.be.a(Promise);
    });

    test('requires type', async () => {
      try {
        await savedObjectsClient.create();
        expect().throw('should have error');
      } catch (e) {
        expect(e.message).to.be(requireMessage);
      }
    });

    test('allows for id to be provided', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      const path = `/api/saved_objects/index-pattern/myId`;
      kfetchStub.withArgs({
        method: 'POST',
        pathname: path,
        query: undefined,
        body: sinon.match.any
      }).returns(Promise.resolve({}));

      savedObjectsClient.create('index-pattern', attributes, { id: 'myId' });

      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(kfetchStub, sinon.match({
        pathname: path
      }));
    });

    test('makes HTTP call', () => {
      const attributes = { foo: 'Foo', bar: 'Bar' };
      savedObjectsClient.create('index-pattern', attributes);

      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(kfetchStub, sinon.match({
        pathname: sinon.match.string,
        body: JSON.stringify({ attributes }),
      }));
    });
  });

  describe('#bulk_create', () => {
    beforeEach(() => {
      kfetchStub.withArgs({
        method: 'POST',
        pathname: `/api/saved_objects/_bulk_create`,
        query: sinon.match.any,
        body: sinon.match.any
      }).returns(Promise.resolve({ saved_objects: [doc] }));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.bulkCreate([doc], {})).to.be.a(Promise);
    });

    test('resolves with instantiated SavedObjects', async () => {
      const response = await savedObjectsClient.bulkCreate([doc], {});
      expect(response).to.have.property('savedObjects');
      expect(response.savedObjects.length).to.eql(1);
      expect(response.savedObjects[0]).to.be.a(SavedObject);
    });

    test('makes HTTP call', async () => {
      await savedObjectsClient.bulkCreate([doc], {});
      sinon.assert.calledOnce(kfetchStub);
    });
  });

  describe('#find', () => {
    const object = { id: 'logstash-*', type: 'index-pattern', title: 'Test' };

    beforeEach(() => {
      kfetchStub.returns(Promise.resolve({ saved_objects: [object] }));
    });

    test('returns a promise', () => {
      expect(savedObjectsClient.find()).to.be.a(Promise);
    });

    test('accepts type', () => {
      const body = { type: 'index-pattern', invalid: true };

      savedObjectsClient.find(body);
      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(kfetchStub, sinon.match({
        pathname: `/api/saved_objects/_find`,
        query: { type: 'index-pattern', invalid: true }
      }));
    });

    test('accepts fields', () => {
      const body = { fields: ['title', 'description'] };

      savedObjectsClient.find(body);
      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.calledWithExactly(kfetchStub, sinon.match({
        pathname: `/api/saved_objects/_find`,
        query: { fields: [ 'title', 'description' ] }
      }));
    });

    test('accepts from/size', () => {
      const body = { from: 50, size: 10 };

      savedObjectsClient.find(body);
      sinon.assert.calledOnce(kfetchStub);
      sinon.assert.alwaysCalledWith(kfetchStub, sinon.match({
        pathname: `/api/saved_objects/_find`,
        query: { from: 50, size: 10 }
      }));
    });
  });
});
