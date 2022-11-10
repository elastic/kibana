/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { Response } from 'superagent';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  const createIndex = async (indexName: string) => {
    await supertest
      .post(`/api/console/proxy?method=PUT&path=/${indexName}`)
      .set('kbn-xsrf', 'true')
      .send({
        mappings: {
          properties: {
            foo: {
              type: 'text',
            },
          },
        },
      })
      .expect(200);
  };

  const createAlias = async (indexName: string, aliasName: string) => {
    await supertest
      .post(`/api/console/proxy?method=POST&path=/_aliases`)
      .set('kbn-xsrf', 'true')
      .send({
        actions: [
          {
            add: {
              index: indexName,
              alias: aliasName,
            },
          },
        ],
      })
      .expect(200);
  };

  const createLegacyTemplate = async (templateName: string) => {
    await supertest
      .post(`/api/console/proxy?method=PUT&path=/_template/${templateName}`)
      .set('kbn-xsrf', 'true')
      .send({
        index_patterns: ['*'],
      });
  };

  const createComponentTemplate = async (templateName: string) => {
    await supertest
      .post(`/api/console/proxy?method=PUT&path=/_component_template/${templateName}`)
      .set('kbn-xsrf', 'true')
      .send({
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
        _meta: {
          description: 'Mappings for @timestamp and message fields',
          'my-custom-meta-field': 'More arbitrary metadata',
        },
      });
  };

  const createIndexTemplate = async (
    templateName: string,
    indexPatterns: string[],
    composedOf: string[]
  ) => {
    await supertest
      .post(`/api/console/proxy?method=PUT&path=/_index_template/${templateName}`)
      .set('kbn-xsrf', 'true')
      .send({
        index_patterns: indexPatterns,
        data_stream: {},
        composed_of: composedOf,
        priority: 500,
        _meta: {
          description: 'Template for my time series data',
          'my-custom-meta-field': 'More arbitrary metadata',
        },
      })
      .expect(200);
  };

  const createDataStream = async (dataStream: string) => {
    await supertest
      .post(`/api/console/proxy?method=PUT&path=/_data_stream/${dataStream}`)
      .set('kbn-xsrf', 'true')
      .send();
  };

  const deleteIndex = async (indexName: string) => {
    await supertest
      .post(`/api/console/proxy?method=DELETE&path=/${indexName}`)
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);
  };

  const deleteAlias = async (indexName: string, aliasName: string) => {
    await supertest
      .post(`/api/console/proxy?method=DELETE&path=/${indexName}/_alias/${aliasName}`)
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);
  };

  const deleteIndexTemplate = async (templateName: string) => {
    await supertest
      .post(`/api/console/proxy?method=DELETE&path=/_index_template/${templateName}`)
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);
  };

  const deleteComponentTemplate = async (templateName: string) => {
    await supertest
      .post(`/api/console/proxy?method=DELETE&path=/_component_template/${templateName}`)
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);
  };

  const deleteLegacyTemplate = async (templateName: string) => {
    await supertest
      .post(`/api/console/proxy?method=DELETE&path=/_template/${templateName}`)
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);
  };

  const deleteDataStream = async (dataStream: string) => {
    await supertest
      .post(`/api/console/proxy?method=DELETE&path=/_data_stream/${dataStream}`)
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);
  };

  function utilTest(name: string, query: object, test: (response: Response) => void) {
    it(name, async () => {
      const response = await supertest.get('/api/console/autocomplete_entities').query(query);
      test(response);
    });
  }

  describe('/api/console/autocomplete_entities', () => {
    const indexName = 'test-index-1';
    const aliasName = 'test-alias-1';
    const indexTemplateName = 'test-index-template-1';
    const componentTemplateName = 'test-component-template-1';
    const dataStreamName = 'test-data-stream-1';
    const legacyTemplateName = 'test-legacy-template-1';

    before(async () => {
      await createIndex(indexName);
      await createAlias(indexName, aliasName);
      await createComponentTemplate(componentTemplateName);
      await createIndexTemplate(indexTemplateName, [`${dataStreamName}*`], [componentTemplateName]);
      await createDataStream(dataStreamName);
      await createLegacyTemplate(legacyTemplateName);
    });

    after(async () => {
      await deleteAlias(indexName, aliasName);
      await deleteIndex(indexName);
      await deleteDataStream(dataStreamName);
      await deleteIndexTemplate(indexTemplateName);
      await deleteComponentTemplate(componentTemplateName);
      await deleteLegacyTemplate(legacyTemplateName);
    });

    utilTest('should not succeed if no settings are provided in query params', {}, (response) => {
      const { status } = response;
      expect(status).to.be(400);
    });

    utilTest(
      'should return an object with properties of "mappings", "aliases", "dataStreams", "legacyTemplates", "indexTemplates", "componentTemplates"',
      {
        indices: true,
        fields: true,
        templates: true,
        dataStreams: true,
      },
      (response) => {
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
      }
    );

    utilTest(
      'should return empty payload with all settings are set to false',
      {
        indices: false,
        fields: false,
        templates: false,
        dataStreams: false,
      },
      (response) => {
        const { body, status } = response;
        expect(status).to.be(200);
        expect(body.legacyTemplates).to.eql({});
        expect(body.indexTemplates).to.eql({});
        expect(body.componentTemplates).to.eql({});
        expect(body.aliases).to.eql({});
        expect(body.mappings).to.eql({});
        expect(body.dataStreams).to.eql({});
      }
    );

    utilTest(
      'should return empty templates with templates setting is set to false',
      {
        indices: true,
        fields: true,
        templates: false,
        dataStreams: true,
      },
      (response) => {
        const { body, status } = response;
        expect(status).to.be(200);
        expect(body.legacyTemplates).to.eql({});
        expect(body.indexTemplates).to.eql({});
        expect(body.componentTemplates).to.eql({});
      }
    );

    utilTest(
      'should return empty data streams with dataStreams setting is set to false',
      {
        indices: true,
        fields: true,
        templates: true,
        dataStreams: false,
      },
      (response) => {
        const { body, status } = response;
        expect(status).to.be(200);
        expect(body.dataStreams).to.eql({});
      }
    );

    utilTest(
      'should return empty aliases with indices setting is set to false',
      {
        indices: false,
        fields: true,
        templates: true,
        dataStreams: true,
      },
      (response) => {
        const { body, status } = response;
        expect(status).to.be(200);
        expect(body.aliases).to.eql({});
      }
    );

    utilTest(
      'should return empty mappings with fields setting is set to false',
      {
        indices: true,
        fields: false,
        templates: true,
        dataStreams: true,
      },
      (response) => {
        const { body, status } = response;
        expect(status).to.be(200);
        expect(body.mappings).to.eql({});
      }
    );

    it('should return mappings with fields setting is set to true', async () => {
      const response = await supertest.get('/api/console/autocomplete_entities').query({
        indices: false,
        fields: true,
        templates: false,
        dataStreams: false,
      });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body.mappings)).to.contain(indexName);
    });

    it('should return aliases with indices setting is set to true', async () => {
      const response = await supertest.get('/api/console/autocomplete_entities').query({
        indices: true,
        fields: false,
        templates: false,
        dataStreams: false,
      });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.aliases[indexName].aliases).to.eql({ [aliasName]: {} });
    });

    it('should return data streams with dataStreams setting is set to true', async () => {
      const response = await supertest.get('/api/console/autocomplete_entities').query({
        indices: false,
        fields: false,
        templates: false,
        dataStreams: true,
      });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(body.dataStreams.data_streams.map((ds: any) => ds.name)).to.contain(dataStreamName);
    });

    it('should return all templates with templates setting is set to true', async () => {
      const response = await supertest.get('/api/console/autocomplete_entities').query({
        indices: false,
        fields: false,
        templates: true,
        dataStreams: false,
      });

      const { body, status } = response;
      expect(status).to.be(200);
      expect(Object.keys(body.legacyTemplates)).to.contain(legacyTemplateName);
      expect(body.indexTemplates.index_templates.map((it: any) => it.name)).to.contain(
        indexTemplateName
      );
      expect(body.componentTemplates.component_templates.map((ct: any) => ct.name)).to.contain(
        componentTemplateName
      );
    });
  });
};
