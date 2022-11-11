/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const client = getService('es');

  const createIndex = async (indexName: string) => {
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            foo: {
              type: 'text',
            },
          },
        },
      },
    });
  };

  const createAlias = async (indexName: string, aliasName: string) => {
    await client.indices.putAlias({
      index: indexName,
      name: aliasName,
    });
  };

  const createLegacyTemplate = async (templateName: string) => {
    await client.indices.putTemplate({
      name: templateName,
      body: {
        index_patterns: ['*'],
      },
    });
  };

  const createComponentTemplate = async (templateName: string) => {
    await client.cluster.putComponentTemplate({
      name: templateName,
      body: {
        template: {
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
                format: 'date_optional_time||epoch_millis',
              },
              message: {
                type: 'wildcard',
              },
            },
          },
        },
      },
    });
  };

  const createIndexTemplate = async (
    templateName: string,
    indexPatterns: string[],
    composedOf: string[]
  ) => {
    await client.indices.putIndexTemplate({
      name: templateName,
      body: {
        index_patterns: indexPatterns,
        data_stream: {},
        composed_of: composedOf,
        priority: 500,
      },
    });
  };

  const createDataStream = async (dataStream: string) => {
    await client.indices.createDataStream({
      name: dataStream,
    });
  };

  const deleteIndex = async (indexName: string) => {
    await client.indices.delete({
      index: indexName,
    });
  };

  const deleteAlias = async (indexName: string, aliasName: string) => {
    await client.indices.deleteAlias({
      index: indexName,
      name: aliasName,
    });
  };

  const deleteIndexTemplate = async (templateName: string) => {
    await client.indices.deleteIndexTemplate({
      name: templateName,
    });
  };

  const deleteComponentTemplate = async (templateName: string) => {
    await client.cluster.deleteComponentTemplate({
      name: templateName,
    });
  };

  const deleteLegacyTemplate = async (templateName: string) => {
    await client.indices.deleteTemplate({
      name: templateName,
    });
  };

  const deleteDataStream = async (dataStream: string) => {
    await client.indices.deleteDataStream({
      name: dataStream,
    });
  };

  const sendRequest = async (query: object) => {
    return await supertest.get('/api/console/autocomplete_entities').query(query);
  };

  describe('/api/console/autocomplete_entities', () => {
    const indexName = 'test-index-1';
    const aliasName = 'test-alias-1';
    const indexTemplateName = 'test-index-template-1';
    const componentTemplateName = 'test-component-template-1';
    const dataStreamName = 'test-data-stream-1';
    const legacyTemplateName = 'test-legacy-template-1';

    before(async () => {
      // Setup indices, aliases, templates, and data streams
      await createIndex(indexName);
      await createAlias(indexName, aliasName);
      await createComponentTemplate(componentTemplateName);
      await createIndexTemplate(indexTemplateName, [dataStreamName], [componentTemplateName]);
      await createDataStream(dataStreamName);
      await createLegacyTemplate(legacyTemplateName);
    });

    after(async () => {
      // Cleanup indices, aliases, templates, and data streams
      await deleteAlias(indexName, aliasName);
      await deleteIndex(indexName);
      await deleteDataStream(dataStreamName);
      await deleteIndexTemplate(indexTemplateName);
      await deleteComponentTemplate(componentTemplateName);
      await deleteLegacyTemplate(legacyTemplateName);
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

    it('should return mappings with fields setting is set to true', async () => {
      const response = await sendRequest({ fields: true });

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
