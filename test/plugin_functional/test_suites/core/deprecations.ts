/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { DomainDeprecationDetails, DeprecationsGetResponse } from '@kbn/core/server/types';
import type { ResolveDeprecationResponse } from '@kbn/core/public';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');

  const CorePluginDeprecationsPluginDeprecations: DomainDeprecationDetails[] = [
    {
      configPath: 'corePluginDeprecations.oldProperty',
      title: 'Setting "corePluginDeprecations.oldProperty" is deprecated',
      level: 'warning',
      message:
        'Setting "corePluginDeprecations.oldProperty" has been replaced by "corePluginDeprecations.newProperty"',
      correctiveActions: {
        manualSteps: [
          'Replace "corePluginDeprecations.oldProperty" with "corePluginDeprecations.newProperty" in the Kibana config file, CLI flag, or environment variable (in Docker only).',
        ],
      },
      deprecationType: 'config',
      domainId: 'corePluginDeprecations',
      requireRestart: true,
    },
    {
      configPath: 'corePluginDeprecations.noLongerUsed',
      title: 'Setting "corePluginDeprecations.noLongerUsed" is deprecated',
      level: 'warning',
      message: 'You no longer need to configure "corePluginDeprecations.noLongerUsed".',
      correctiveActions: {
        manualSteps: [
          'Remove "corePluginDeprecations.noLongerUsed" from the Kibana config file, CLI flag, or environment variable (in Docker only).',
        ],
      },
      deprecationType: 'config',
      domainId: 'corePluginDeprecations',
      requireRestart: true,
    },
    {
      configPath: 'corePluginDeprecations.secret',
      title: 'corePluginDeprecations has a deprecated setting',
      level: 'critical',
      message:
        'Kibana plugin functional tests will no longer allow corePluginDeprecations.secret config to be set to anything except 42.',
      correctiveActions: {
        manualSteps: [
          'This is an intentional deprecation for testing with no intention for having it fixed!',
        ],
      },
      documentationUrl: 'config-secret-doc-url',
      deprecationType: 'config',
      domainId: 'corePluginDeprecations',
      requireRestart: true,
    },
    {
      title: 'CorePluginDeprecationsPlugin plugin is deprecated',
      message: 'CorePluginDeprecationsPlugin is a deprecated feature for testing.',
      documentationUrl: 'test-url',
      level: 'warning',
      correctiveActions: {
        manualSteps: ['Step a', 'Step b'],
      },
      deprecationType: 'feature',
      domainId: 'corePluginDeprecations',
    },
    {
      title: 'Detected saved objects in test-deprecations-plugin',
      message: 'SavedObject test-deprecations-plugin is still being used.',
      documentationUrl: 'another-test-url',
      level: 'critical',
      correctiveActions: {
        manualSteps: ['Step a', 'Step b'],
      },
      domainId: 'corePluginDeprecations',
    },
  ];

  describe('deprecations service', () => {
    before(() => esArchiver.load('test/functional/fixtures/es_archiver/deprecations_service'));
    after(() => esArchiver.unload('test/functional/fixtures/es_archiver/deprecations_service'));

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
                title: 'CorePluginDeprecationsPlugin plugin is deprecated',
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
            reason: 'This deprecation cannot be resolved automatically.',
            status: 'fail',
          });
        });

        it('fails on bad request from correctiveActions.api', async () => {
          const resolveResult = await browser.executeAsync<ResolveDeprecationResponse>((cb) => {
            return window._coreProvider.start.core.deprecations
              .resolveDeprecation({
                title: 'CorePluginDeprecationsPlugin plugin is deprecated',
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
                  manualSteps: ['Step a', 'Step b'],
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
                title: 'CorePluginDeprecationsPlugin plugin is deprecated',
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
                  manualSteps: ['Step a', 'Step b'],
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
                  title: 'CorePluginDeprecationsPlugin plugin is deprecated',
                  message: 'CorePluginDeprecationsPlugin is a deprecated feature for testing.',
                  documentationUrl: 'test-url',
                  level: 'warning',
                  correctiveActions: {
                    api: {
                      method: 'POST',
                      path: '/api/core_deprecations_resolve/',
                      body: { keyId },
                    },
                    manualSteps: ['Step a', 'Step b'],
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
            .then(({ body }): Promise<DeprecationsGetResponse> => {
              return body;
            });

          const deprecation = deprecations.find(
            ({ message }) => message === 'SavedObject test-deprecations-plugin is still being used.'
          );

          expect(deprecation).to.eql(undefined);
        });
      });
    });
  });
}
