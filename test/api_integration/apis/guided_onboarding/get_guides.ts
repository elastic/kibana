/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { testGuideStep1ActiveState } from '@kbn/guided-onboarding-plugin/public/services/api.mocks';
import {
  guideStateSavedObjectsType,
  pluginStateSavedObjectsType,
} from '@kbn/guided-onboarding-plugin/server/saved_objects/guided_setup';
import { appSearchGuideId } from '@kbn/enterprise-search-plugin/common/guided_onboarding/search_guide_config';
import { API_BASE_PATH } from '@kbn/guided-onboarding-plugin/common';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { createGuides } from './helpers';

const getGuidesPath = `${API_BASE_PATH}/guides`;
export default function testGetGuidesState({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe(`GET ${getGuidesPath}`, () => {
    afterEach(async () => {
      // Clean up saved objects
      await kibanaServer.savedObjects.clean({
        types: [guideStateSavedObjectsType, pluginStateSavedObjectsType],
      });
    });

    it('returns an empty array if no guides', async () => {
      const response = await supertest
        .get(getGuidesPath)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);
      expect(response.body).not.to.be.empty();
      expect(response.body.state).to.be.empty();
    });

    it('returns all created guides (active and inactive)', async () => {
      await createGuides(kibanaServer, [
        testGuideStep1ActiveState,
        { ...testGuideStep1ActiveState, guideId: appSearchGuideId },
      ]);
      const response = await supertest
        .get(getGuidesPath)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);
      expect(response.body).not.to.be.empty();
      expect(response.body.state).to.eql([
        testGuideStep1ActiveState,
        { ...testGuideStep1ActiveState, guideId: appSearchGuideId },
      ]);
    });
  });
}
