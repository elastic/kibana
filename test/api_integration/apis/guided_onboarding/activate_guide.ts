/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import {
  pluginStateSavedObjectsType,
  pluginStateSavedObjectsId,
  guideStateSavedObjectsType,
} from '@kbn/guided-onboarding-plugin/server/saved_objects/guided_setup';
import { testGuideNotActiveState } from '@kbn/guided-onboarding-plugin/public/services/api.mocks';
import { testGuideId } from '@kbn/guided-onboarding';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { createGuides } from './helpers';

const path = `/api/guided_onboarding/guides/activate`;
export default function testPutState({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe(`POST ${path}`, () => {
    afterEach(async () => {
      // Clean up saved objects
      await kibanaServer.savedObjects.clean({
        types: [pluginStateSavedObjectsType, guideStateSavedObjectsType],
      });
    });

    it('activates a guide without a previous state', async () => {
      const {
        body: { pluginState },
      } = await supertest
        /*
         * We have to use a production guide for this test, because the activate route relies on the guide config when
         * activating it for the first time (to create a default state from the config). The testGuide config is not
         * registered in the testing environment.
         */
        .post(`${path}/search`)
        .set('kbn-xsrf', 'true')
        .send({
          status: 'in_progress',
        })
        .expect(200);
      const { status, activeGuide } = pluginState;

      expect(status).to.eql('in_progress');
      expect(activeGuide.guideId).to.eql('search');
      expect(activeGuide.isActive).to.eql(true);
      expect(activeGuide.status).to.eql('not_started');
      expect(activeGuide.steps).to.not.be.empty();

      const createdPluginState = await kibanaServer.savedObjects.get({
        type: pluginStateSavedObjectsType,
        id: pluginStateSavedObjectsId,
      });

      expect(createdPluginState.attributes.status).to.eql('in_progress');

      const createdGuideState = await kibanaServer.savedObjects.get({
        type: guideStateSavedObjectsType,
        id: 'search',
      });
      expect(createdGuideState.attributes.guideId).to.eql('search');
      expect(createdGuideState.attributes.isActive).to.eql(true);
      expect(createdGuideState.attributes.status).to.eql('not_started');
      expect(createdGuideState.attributes.steps).to.not.be.empty();
    });

    it('activates a guide with a previous state', async () => {
      await createGuides(kibanaServer, [testGuideNotActiveState]);

      const {
        body: { pluginState },
      } = await supertest
        .post(`${path}/${testGuideId}`)
        .set('kbn-xsrf', 'true')
        .send({
          status: 'in_progress',
        })
        .expect(200);

      const { status, activeGuide } = pluginState;

      expect(status).to.eql('in_progress');
      expect(activeGuide.guideId).to.eql(testGuideId);
      expect(activeGuide.isActive).to.eql(true);
      expect(activeGuide.status).to.eql('in_progress');
      expect(activeGuide.steps).to.not.be.empty();

      const createdPluginState = await kibanaServer.savedObjects.get({
        type: pluginStateSavedObjectsType,
        id: pluginStateSavedObjectsId,
      });

      expect(createdPluginState.attributes.status).to.eql('in_progress');

      const createdGuideState = await kibanaServer.savedObjects.get({
        type: guideStateSavedObjectsType,
        id: 'testGuide',
      });
      expect(createdGuideState.attributes.guideId).to.eql(testGuideId);
      expect(createdGuideState.attributes.isActive).to.eql(true);
      // when re-activating an existing guide state,
      // we set it to 'in_progress' even if it might have been 'not_started' before
      expect(createdGuideState.attributes.status).to.eql('in_progress');
      expect(createdGuideState.attributes.steps).to.not.be.empty();
    });
  });
}
