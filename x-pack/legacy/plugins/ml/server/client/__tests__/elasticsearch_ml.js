/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { elasticsearchJsPlugin } from '../elasticsearch_ml';

describe('ML - Endpoints', () => {
  // Check all paths in the ML elasticsearchJsPlugin start with a leading forward slash
  // so they work if Kibana is run behind a reverse proxy
  const PATH_START = '/';
  const urls = [];

  // Stub objects
  const Client = {
    prototype: {},
  };

  const components = {
    clientAction: {
      factory: function(obj) {
        // add each endpoint URL to a list
        if (obj.urls) {
          obj.urls.forEach(url => {
            urls.push(url.fmt);
          });
        }
        if (obj.url) {
          urls.push(obj.url.fmt);
        }
      },
      namespaceFactory() {
        return {
          prototype: {},
        };
      },
    },
  };

  // Stub elasticsearchJsPlugin
  elasticsearchJsPlugin(Client, null, components);

  describe('paths', () => {
    it(`should start with ${PATH_START}`, () => {
      urls.forEach(url => {
        expect(url[0]).to.eql(PATH_START);
      });
    });
  });
});
