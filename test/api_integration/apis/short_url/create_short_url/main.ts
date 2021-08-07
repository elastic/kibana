/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    it('can create a short URL with just locator data', async () => {
      const response = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {},
      });

      expect(response.status).to.be(200);
      expect(typeof response.body.url).to.be('object');
      expect(typeof response.body.url.id).to.be('string');
      expect(typeof response.body.url.locator).to.be('object');
      expect(response.body.url.locator.id).to.be('LEGACY_SHORT_URL_LOCATOR');
      expect(typeof response.body.url.locator.version).to.be('string');
      expect(response.body.url.locator.state).to.eql({});
      expect(response.body.url.accessCount).to.be(0);
      expect(typeof response.body.url.accessDate).to.be('number');
      expect(typeof response.body.url.createDate).to.be('number');
      expect(response.body.url.slug).to.be('');
      expect(response.body.url.url).to.be('');
    });

    it('can create a short URL with locator params', async () => {
      const response = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {
          url: '/foo/bar',
        },
      });

      expect(response.status).to.be(200);
      expect(typeof response.body.url).to.be('object');
      expect(typeof response.body.url.id).to.be('string');
      expect(typeof response.body.url.locator).to.be('object');
      expect(response.body.url.locator.id).to.be('LEGACY_SHORT_URL_LOCATOR');
      expect(typeof response.body.url.locator.version).to.be('string');
      expect(response.body.url.locator.state).to.eql({
        url: '/foo/bar',
      });
      expect(response.body.url.accessCount).to.be(0);
      expect(typeof response.body.url.accessDate).to.be('number');
      expect(typeof response.body.url.createDate).to.be('number');
      expect(response.body.url.slug).to.be('');
      expect(response.body.url.url).to.be('');
    });

    it('can create a short URL with custom slug', async () => {
      const response = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {
          url: '/foo/bar',
        },
        slug: 'click-me',
      });

      expect(response.status).to.be(200);
      expect(typeof response.body.url).to.be('object');
      expect(typeof response.body.url.id).to.be('string');
      expect(typeof response.body.url.locator).to.be('object');
      expect(response.body.url.locator.id).to.be('LEGACY_SHORT_URL_LOCATOR');
      expect(typeof response.body.url.locator.version).to.be('string');
      expect(response.body.url.locator.state).to.eql({
        url: '/foo/bar',
      });
      expect(response.body.url.accessCount).to.be(0);
      expect(typeof response.body.url.accessDate).to.be('number');
      expect(typeof response.body.url.createDate).to.be('number');
      expect(response.body.url.slug).to.be('click-me');
      expect(response.body.url.url).to.be('');
    });
  });
}
