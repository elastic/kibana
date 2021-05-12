/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { DomainDeprecationDetails, DeprecationsGetResponse } from 'src/core/server/types';
import type { ResolveDeprecationResponse } from 'src/core/public';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');

  const CorePluginDeprecationsPluginDeprecations = [
    {
      level: 'critical',
      message:
        '"corePluginDeprecations.oldProperty" is deprecated and has been replaced by "corePluginDeprecations.newProperty"',
      correctiveActions: {
        manualSteps: [
          'Replace "corePluginDeprecations.oldProperty" with "corePluginDeprecations.newProperty" in the Kibana config file, CLI flag, or environment variable (in Docker only).',
        ],
      },
      domainId: 'corePluginDeprecations',
    },
    {
      level: 'critical',
      message: 'corePluginDeprecations.noLongerUsed is deprecated and is no longer used',
      correctiveActions: {
        manualSteps: [
          'Remove "corePluginDeprecations.noLongerUsed" from the Kibana config file, CLI flag, or environment variable (in Docker only)',
        ],
      },
      domainId: 'corePluginDeprecations',
    },
    {
      level: 'critical',
      message:
        'Kibana plugin functional tests will no longer allow corePluginDeprecations.secret config to be set to anything except 42.',
      correctiveActions: {},
      documentationUrl: 'config-secret-doc-url',
      domainId: 'corePluginDeprecations',
    },
    {
      message: 'CorePluginDeprecationsPlugin is a deprecated feature for testing.',
      documentationUrl: 'test-url',
      level: 'warning',
      correctiveActions: {
        manualSteps: ['Step a', 'Step b'],
      },
      domainId: 'corePluginDeprecations',
    },
    {
      message: 'SavedObject test-deprecations-plugin is still being used.',
      documentationUrl: 'another-test-url',
      level: 'critical',
      correctiveActions: {},
      domainId: 'corePluginDeprecations',
    },
  ];

  describe('deprecations service', () => {
    before(() => esArchiver.load('../functional/fixtures/es_archiver/deprecations_service'));
    after(() => esArchiver.unload('../functional/fixtures/es_archiver/deprecations_service'));

    describe('GET /api/deprecations/', async () => {
      it('returns registered config deprecations and feature deprecations', async () => {
        const { body } = await supertest.get('/api/deprecations/').set('kbn-xsrf', 'true');

        const { deprecations } = body as DeprecationsGetResponse;
        expect(Array.isArray(deprecations)).to.be(true);
        const corePluginDeprecations = deprecations.filter(
          ({ domainId }) => domainId === 'corePluginDeprecations'
        );

        expect(corePluginDeprecations).to.eql(CorePluginDeprecationsPluginDeprecations);
      });
    });

    describe('Public API', () => {
      before(async () => await PageObjects.common.navigateToApp('home'));

      it('#getAllDeprecations returns all deprecations plugin deprecations', async () => {
        const result = await browser.executeAsync<DomainDeprecationDetails[]>((cb) => {
          return window._coreProvider.start.core.deprecations.getAllDeprecations().then(cb);
        });

        const corePluginDeprecations = result.filter(
          ({ domainId }) => domainId === 'corePluginDeprecations'
        );

        expect(corePluginDeprecations).to.eql(CorePluginDeprecationsPluginDeprecations);
      });

      it('#getDeprecations returns domain deprecations', async () => {
        const corePluginDeprecations = await browser.executeAsync<DomainDeprecationDetails[]>(
          (cb) => {
            return window._coreProvider.start.core.deprecations
              .getDeprecations('corePluginDeprecations')
              .then(cb);
          }
        );

        expect(corePluginDeprecations).to.eql(CorePluginDeprecationsPluginDeprecations);
      });

      describe('resolveDeprecation', () => {
        it('fails on missing correctiveActions.api', async () => {
          const resolveResult = await browser.executeAsync<ResolveDeprecationResponse>((cb) => {
            return window._coreProvider.start.core.deprecations
              .resolveDeprecation({
                message: 'CorePluginDeprecationsPlugin is a deprecated feature for testing.',
                documentationUrl: 'test-url',
                level: 'warning',
                correctiveActions: {
                  manualSteps: ['Step a', 'Step b'],
                },
                domainId: 'corePluginDeprecations',
              })
              .then(cb);
          });

          expect(resolveResult).to.eql({
            reason: 'deprecation has no correctiveAction via api.',
            status: 'fail',
          });
        });

        it('fails on bad request from correctiveActions.api', async () => {
          const resolveResult = await browser.executeAsync<ResolveDeprecationResponse>((cb) => {
            return window._coreProvider.start.core.deprecations
              .resolveDeprecation({
                message: 'CorePluginDeprecationsPlugin is a deprecated feature for testing.',
                documentationUrl: 'test-url',
                level: 'warning',
                correctiveActions: {
                  api: {
                    method: 'POST',
                    path: '/api/core_deprecations_resolve/',
                    body: {
                      mockFail: true,
                    },
                  },
                },
                domainId: 'corePluginDeprecations',
              })
              .then(cb);
          });

          expect(resolveResult).to.eql({
            reason: 'Mocking api failure',
            status: 'fail',
          });
        });

        it('fails on 404 request from correctiveActions.api', async () => {
          const resolveResult = await browser.executeAsync<ResolveDeprecationResponse>((cb) => {
            return window._coreProvider.start.core.deprecations
              .resolveDeprecation({
                message: 'CorePluginDeprecationsPlugin is a deprecated feature for testing.',
                documentationUrl: 'test-url',
                level: 'warning',
                correctiveActions: {
                  api: {
                    method: 'POST',
                    path: '/api/invalid_route_not_registered/',
                    body: {
                      mockFail: true,
                    },
                  },
                },
                domainId: 'corePluginDeprecations',
              })
              .then(cb);
          });

          expect(resolveResult).to.eql({
            reason: 'Not Found',
            status: 'fail',
          });
        });

        it('returns { status: ok } on successful correctiveActions.api', async () => {
          const savedObjectId = await supertest
            .get('/api/saved_objects/_find?type=test-deprecations-plugin')
            .set('kbn-xsrf', 'true')
            .expect(200)
            .then(({ body }) => {
              expect(body.total).to.be(1);
              return body.saved_objects[0].id;
            });

          const resolveResult = await browser.executeAsync<ResolveDeprecationResponse>(
            (keyId, cb) => {
              return window._coreProvider.start.core.deprecations
                .resolveDeprecation({
                  message: 'CorePluginDeprecationsPlugin is a deprecated feature for testing.',
                  documentationUrl: 'test-url',
                  level: 'warning',
                  correctiveActions: {
                    api: {
                      method: 'POST',
                      path: '/api/core_deprecations_resolve/',
                      body: { keyId },
                    },
                  },
                  domainId: 'corePluginDeprecations',
                })
                .then(cb);
            },
            savedObjectId
          );

          expect(resolveResult).to.eql({ status: 'ok' });
          await supertest
            .get('/api/saved_objects/_find?type=test-deprecations-plugin')
            .set('kbn-xsrf', 'true')
            .expect(200)
            .then(({ body }) => {
              expect(body.total).to.be(0);
            });

          const { deprecations } = await supertest
            .get('/api/deprecations/')
            .set('kbn-xsrf', 'true')
            .then(
              ({ body }): Promise<DeprecationsGetResponse> => {
                return body;
              }
            );

          const deprecation = deprecations.find(
            ({ message }) => message === 'SavedObject test-deprecations-plugin is still being used.'
          );

          expect(deprecation).to.eql(undefined);
        });
      });
    });
  });
}
