/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const getConfigsPath = '/api/guided_onboarding/configs';
export default function testGetGuidesState({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('GET /api/guided_onboarding/configs', () => {
    it('returns all guide configs', async () => {
      const response = await supertest.get(getConfigsPath).expect(200);
      expect(response.body).not.to.be.empty();
      const { configs } = response.body;
      // check that all guides are present
      ['testGuide', 'security', 'search', 'observability'].map((guideId) => {
        expect(configs).to.have.property(guideId);
      });
    });
  });
}
