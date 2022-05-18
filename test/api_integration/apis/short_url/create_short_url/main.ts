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
      expect(typeof response.body).to.be('object');
      expect(typeof response.body.id).to.be('string');
      expect(typeof response.body.locator).to.be('object');
      expect(response.body.locator.id).to.be('LEGACY_SHORT_URL_LOCATOR');
      expect(typeof response.body.locator.version).to.be('string');
      expect(response.body.locator.state).to.eql({});
      expect(response.body.accessCount).to.be(0);
      expect(typeof response.body.accessDate).to.be('number');
      expect(typeof response.body.createDate).to.be('number');
      expect(typeof response.body.slug).to.be('string');
      expect(response.body.url).to.be('');
    });

    it('can create a short URL with locator params', async () => {
      const response = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {
          url: '/foo/bar',
        },
      });

      expect(response.status).to.be(200);
      expect(typeof response.body).to.be('object');
      expect(typeof response.body.id).to.be('string');
      expect(typeof response.body.locator).to.be('object');
      expect(response.body.locator.id).to.be('LEGACY_SHORT_URL_LOCATOR');
      expect(typeof response.body.locator.version).to.be('string');
      expect(response.body.locator.state).to.eql({
        url: '/foo/bar',
      });
      expect(response.body.accessCount).to.be(0);
      expect(typeof response.body.accessDate).to.be('number');
      expect(typeof response.body.createDate).to.be('number');
      expect(typeof response.body.slug).to.be('string');
      expect(response.body.url).to.be('');
    });

    describe('short_url slugs', () => {
      it('generates at least 4 character slug by default', async () => {
        const response = await supertest.post('/api/short_url').send({
          locatorId: 'LEGACY_SHORT_URL_LOCATOR',
          params: {},
        });

        expect(response.status).to.be(200);
        expect(typeof response.body.slug).to.be('string');
        expect(response.body.slug.length > 3).to.be(true);
        expect(response.body.url).to.be('');
      });

      it('can generate a human-readable slug, composed of three words', async () => {
        const response = await supertest.post('/api/short_url').send({
          locatorId: 'LEGACY_SHORT_URL_LOCATOR',
          params: {},
          humanReadableSlug: true,
        });

        expect(response.status).to.be(200);
        expect(typeof response.body.slug).to.be('string');
        const words = response.body.slug.split('-');
        expect(words.length).to.be(3);
        for (const word of words) {
          expect(word.length > 0).to.be(true);
        }
      });

      it('can create a short URL with custom slug', async () => {
        const rnd = Math.round(Math.random() * 1e6) + 1;
        const slug = 'test-slug-' + Date.now() + '-' + rnd;
        const response = await supertest.post('/api/short_url').send({
          locatorId: 'LEGACY_SHORT_URL_LOCATOR',
          params: {
            url: '/foo/bar',
          },
          slug,
        });

        expect(response.status).to.be(200);
        expect(typeof response.body).to.be('object');
        expect(typeof response.body.id).to.be('string');
        expect(typeof response.body.locator).to.be('object');
        expect(response.body.locator.id).to.be('LEGACY_SHORT_URL_LOCATOR');
        expect(typeof response.body.locator.version).to.be('string');
        expect(response.body.locator.state).to.eql({
          url: '/foo/bar',
        });
        expect(response.body.accessCount).to.be(0);
        expect(typeof response.body.accessDate).to.be('number');
        expect(typeof response.body.createDate).to.be('number');
        expect(response.body.slug).to.be(slug);
        expect(response.body.url).to.be('');
      });

      it('cannot create a short URL with the same slug', async () => {
        const rnd = Math.round(Math.random() * 1e6) + 1;
        const slug = 'test-slug-' + Date.now() + '-' + rnd;
        const response1 = await supertest.post('/api/short_url').send({
          locatorId: 'LEGACY_SHORT_URL_LOCATOR',
          params: {
            url: '/foo/bar',
          },
          slug,
        });
        const response2 = await supertest.post('/api/short_url').send({
          locatorId: 'LEGACY_SHORT_URL_LOCATOR',
          params: {
            url: '/foo/bar',
          },
          slug,
        });

        expect(response1.status).to.be(200);
        expect(response2.status).to.be(409);
      });
    });
  });
}
