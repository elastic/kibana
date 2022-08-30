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

  function utilTest(name: string, query: object, test: (response: Response) => void) {
    it(name, async () => {
      const response = await supertest.get('/api/console/autocomplete_entities').query(query);
      test(response);
    });
  }

  describe('/api/console/autocomplete_entities', () => {
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
  });
};
