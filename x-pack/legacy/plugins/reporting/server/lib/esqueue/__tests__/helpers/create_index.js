/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { createIndex } from '../../helpers/create_index';
import { ClientMock } from '../fixtures/legacy_elasticsearch';
import { constants } from '../../constants';

describe('Create Index', function() {
  describe('Does not exist', function() {
    let client;
    let createSpy;

    beforeEach(function() {
      client = new ClientMock();
      createSpy = sinon.spy(client, 'callWithInternalUser').withArgs('indices.create');
    });

    it('should return true', function() {
      const indexName = 'test-index';
      const result = createIndex(client, indexName);

      return result.then(exists => expect(exists).to.be(true));
    });

    it('should create the index with mappings and default settings', function() {
      const indexName = 'test-index';
      const settings = constants.DEFAULT_SETTING_INDEX_SETTINGS;
      const result = createIndex(client, indexName);

      return result.then(function() {
        const payload = createSpy.getCall(0).args[1];
        sinon.assert.callCount(createSpy, 1);
        expect(payload).to.have.property('index', indexName);
        expect(payload).to.have.property('body');
        expect(payload.body).to.have.property('settings');
        expect(payload.body.settings).to.eql(settings);
        expect(payload.body).to.have.property('mappings');
        expect(payload.body.mappings).to.have.property('properties');
      });
    });

    it('should create the index with custom settings', function() {
      const indexName = 'test-index';
      const settings = {
        ...constants.DEFAULT_SETTING_INDEX_SETTINGS,
        auto_expand_replicas: false,
        number_of_shards: 3000,
        number_of_replicas: 1,
        format: '3000',
      };
      const result = createIndex(client, indexName, settings);

      return result.then(function() {
        const payload = createSpy.getCall(0).args[1];
        sinon.assert.callCount(createSpy, 1);
        expect(payload).to.have.property('index', indexName);
        expect(payload).to.have.property('body');
        expect(payload.body).to.have.property('settings');
        expect(payload.body.settings).to.eql(settings);
        expect(payload.body).to.have.property('mappings');
        expect(payload.body.mappings).to.have.property('properties');
      });
    });
  });

  describe('Does exist', function() {
    let client;
    let createSpy;

    beforeEach(function() {
      client = new ClientMock();
      sinon
        .stub(client, 'callWithInternalUser')
        .withArgs('indices.exists')
        .callsFake(() => Promise.resolve(true));
      createSpy = client.callWithInternalUser.withArgs('indices.create');
    });

    it('should return true', function() {
      const indexName = 'test-index';
      const result = createIndex(client, indexName);

      return result.then(exists => expect(exists).to.be(true));
    });

    it('should not create the index', function() {
      const indexName = 'test-index';
      const result = createIndex(client, indexName);

      return result.then(function() {
        sinon.assert.callCount(createSpy, 0);
      });
    });
  });
});
