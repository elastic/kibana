/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const console = getService('console');
  const supertest = getService('supertest');

  const sendRequest = (query: object) =>
    supertest
      .get('/api/console/autocomplete_entities')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .query(query);

  describe('/api/console/autocomplete_entities', function () {
    const indexName = 'test-index-1';
    const aliasName = 'test-alias-1';
    const indexTemplateName = 'test-index-template-1';
    const componentTemplateName = 'test-component-template-1';
    const dataStreamName = 'test-data-stream-1';
    const legacyTemplateName = 'test-legacy-template-1';

    before(async () => {
      // Setup indices, aliases, templates, and data streams
      await console.createIndex(indexName);
      await console.createAlias(indexName, aliasName);
      await console.createComponentTemplate(componentTemplateName);
      await console.createIndexTemplate(
        indexTemplateName,
        [dataStreamName],
        [componentTemplateName]
      );
      await console.createDataStream(dataStreamName);
      await console.createLegacyTemplate(legacyTemplateName);
    });

    after(async () => {
      // Cleanup indices, aliases, templates, and data streams
      await console.deleteAlias(indexName, aliasName);
      await console.deleteIndex(indexName);
      await console.deleteDataStream(dataStreamName);
      await console.deleteIndexTemplate(indexTemplateName);
      await console.deleteComponentTemplate(componentTemplateName);
      await console.deleteLegacyTemplate(legacyTemplateName);
    });

    it('should not succeed if no settings are provided in query params', async () => {
      const response = await sendRequest({});
      const { status } = response;
      expect(status).to.be(400);
    });

    it('should return an object with properties of "mappings", "aliases", "dataStreams", "legacyTemplates", "indexTemplates", "componentTemplates"', async () => {
      const response = await sendRequest({
        indices: true,
        fields: true,
        templates: true,
        dataStreams: true,
      });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body).sort()).to.eql([
        'aliases',
        'componentTemplates',
        'dataStreams',
        'indexTemplates',
        'legacyTemplates',
        'mappings',
      ]);
    });

    it('should return empty payload with all settings are set to false', async () => {
      const response = await sendRequest({
        indices: false,
        fields: false,
        templates: false,
        dataStreams: false,
      });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.legacyTemplates).to.eql({});
      expect(body.indexTemplates).to.eql({});
      expect(body.componentTemplates).to.eql({});
      expect(body.aliases).to.eql({});
      expect(body.mappings).to.eql({});
      expect(body.dataStreams).to.eql({});
    });

    it('should return empty templates with templates setting is set to false', async () => {
      const response = await sendRequest({
        templates: false,
      });
      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.legacyTemplates).to.eql({});
      expect(body.indexTemplates).to.eql({});
      expect(body.componentTemplates).to.eql({});
    });

    it('should return empty data streams with dataStreams setting is set to false', async () => {
      const response = await sendRequest({
        dataStreams: false,
      });
      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.dataStreams).to.eql({});
    });

    it('should return empty aliases with indices setting is set to false', async () => {
      const response = await sendRequest({
        indices: false,
      });
      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.aliases).to.eql({});
    });

    it('should return empty mappings with fields setting is set to false', async () => {
      const response = await sendRequest({
        fields: false,
      });
      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.mappings).to.eql({});
    });

    it('should not return mappings with fields setting is set to true without the list of indices is provided', async () => {
      const response = await sendRequest({ fields: true });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body.mappings)).to.not.contain(indexName);
    });

    it('should return mappings with fields setting is set to true and the list of indices is provided', async () => {
      const response = await sendRequest({ fields: true, fieldsIndices: indexName });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body.mappings)).to.contain(indexName);
    });

    it('should return aliases with indices setting is set to true', async () => {
      const response = await sendRequest({ indices: true });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.aliases[indexName].aliases).to.eql({ [aliasName]: {} });
    });

    it('should return data streams with dataStreams setting is set to true', async () => {
      const response = await sendRequest({ dataStreams: true });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.dataStreams.data_streams.map((ds: { name: string }) => ds.name)).to.contain(
        dataStreamName
      );
    });

    it('should return all templates with templates setting is set to true', async () => {
      const response = await sendRequest({ templates: true });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body.legacyTemplates)).to.contain(legacyTemplateName);
      expect(body.indexTemplates.index_templates.map((it: { name: string }) => it.name)).to.contain(
        indexTemplateName
      );
      expect(
        body.componentTemplates.component_templates.map((ct: { name: string }) => ct.name)
      ).to.contain(componentTemplateName);
    });
  });
};
