/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { DeprecationsGetResponse } from 'src/core/server/types';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('deprecations service', () => {
    describe('GET /api/deprecations/', async () => {
      it('returns registered config deprecations and feature deprecations', async () => {
        const { body } = await supertest.get('/api/deprecations/').set('kbn-xsrf', 'true');

        const { deprecationsInfo } = body as DeprecationsGetResponse;
        expect(Array.isArray(deprecationsInfo)).to.be(true);
        const corePluginDeprecations = deprecationsInfo.filter(
          ({ domainId }) => domainId === 'corePluginDeprecations'
        );

        expect(corePluginDeprecations).to.eql([
          {
            level: 'critical',
            message:
              '"corePluginDeprecations.oldProperty" is deprecated and has been replaced by "corePluginDeprecations.newProperty"',
            correctiveActions: {
              manualSteps: [
                'Replace "corePluginDeprecations.oldProperty" in the kibana.yml file with "corePluginDeprecations.newProperty"',
              ],
            },
            domainId: 'corePluginDeprecations',
          },
          {
            level: 'critical',
            message: 'corePluginDeprecations.noLongerUsed is deprecated and is no longer used',
            correctiveActions: {
              manualSteps: [
                'Remove "corePluginDeprecations.noLongerUsed" from the kibana.yml file."',
              ],
            },
            domainId: 'corePluginDeprecations',
          },
          {
            level: 'critical',
            message:
              'Kibana plugin funcitonal tests will no longer allow corePluginDeprecations.secret config to be set to anything except 42.',
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
        ]);
      });
    });

    describe('registerDeprecations', () => {
      before(() => esArchiver.load('../functional/fixtures/es_archiver/deprecations_service'));
      after(() => esArchiver.unload('../functional/fixtures/es_archiver/deprecations_service'));
      it('calls registered getDeprecations', async () => {
        const { body } = await supertest.get('/api/deprecations/').set('kbn-xsrf', 'true');

        const { deprecationsInfo } = body as DeprecationsGetResponse;

        const deprecation = deprecationsInfo.find(
          ({ message }) => message === 'SavedObject test-deprecations-plugin is still being used.'
        );

        expect(deprecation).to.eql({
          message: 'SavedObject test-deprecations-plugin is still being used.',
          documentationUrl: 'another-test-url',
          level: 'critical',
          correctiveActions: {},
          domainId: 'corePluginDeprecations',
        });
      });
    });
  });
}
