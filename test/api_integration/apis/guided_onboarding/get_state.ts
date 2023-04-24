/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import {
  testGuideStep1ActiveState,
  testGuideNotActiveState,
  mockPluginStateNotStarted,
  testGuideParams,
} from '@kbn/guided-onboarding-plugin/public/services/api.mocks';
import {
  guideStateSavedObjectsType,
  pluginStateSavedObjectsType,
} from '@kbn/guided-onboarding-plugin/server/saved_objects/guided_setup';
import { API_BASE_PATH } from '@kbn/guided-onboarding-plugin/common';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { createPluginState, createGuides } from './helpers';

const getDateXDaysAgo = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(new Date().getDate() - daysAgo);
  return date.toISOString();
};

const getStatePath = `${API_BASE_PATH}/state`;
export default function testGetState({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe(`GET ${getStatePath}`, () => {
    afterEach(async () => {
      // Clean up saved objects
      await kibanaServer.savedObjects.clean({
        types: [guideStateSavedObjectsType, pluginStateSavedObjectsType],
      });
    });

    it('returns the default plugin state if no saved objects', async () => {
      const response = await supertest.get(getStatePath).expect(200);
      expect(response.body.pluginState).not.to.be.empty();
      expect(response.body).to.eql({
        pluginState: mockPluginStateNotStarted,
      });
    });

    it('returns the plugin state with an active guide', async () => {
      // Create an active guide
      await createGuides(kibanaServer, [testGuideStep1ActiveState]);

      // Create a plugin state
      await createPluginState(kibanaServer, {
        status: 'in_progress',
        creationDate: new Date().toISOString(),
      });

      const response = await supertest.get(getStatePath).expect(200);
      expect(response.body.pluginState).not.to.be.empty();
      expect(response.body).to.eql({
        pluginState: {
          status: 'in_progress',
          isActivePeriod: true,
          activeGuide: testGuideStep1ActiveState,
        },
      });
    });

    it('returns only the plugin state when no guide is active', async () => {
      // Create an active guide
      await createGuides(kibanaServer, [testGuideNotActiveState]);

      // Create a plugin state
      await createPluginState(kibanaServer, {
        status: 'in_progress',
        creationDate: new Date().toISOString(),
      });

      const response = await supertest.get(getStatePath).expect(200);
      expect(response.body.pluginState).not.to.be.empty();
      expect(response.body).to.eql({
        pluginState: {
          status: 'in_progress',
          isActivePeriod: true,
        },
      });
    });

    it('returns isActivePeriod=false if creationDate is 40 days ago', async () => {
      // Create a plugin state
      await createPluginState(kibanaServer, {
        status: 'not_started',
        creationDate: getDateXDaysAgo(40),
      });

      const response = await supertest.get(getStatePath).expect(200);
      expect(response.body.pluginState).not.to.be.empty();
      expect(response.body.pluginState.isActivePeriod).to.eql(false);
    });

    it('returns isActivePeriod=true if creationDate is 20 days ago', async () => {
      // Create a plugin state
      await createPluginState(kibanaServer, {
        status: 'not_started',
        creationDate: getDateXDaysAgo(20),
      });

      const response = await supertest.get(getStatePath).expect(200);
      expect(response.body.pluginState).not.to.be.empty();
      expect(response.body.pluginState.isActivePeriod).to.eql(true);
    });

    it('returns the dynamic params', async () => {
      // Create an active guide
      await createGuides(kibanaServer, [{ ...testGuideStep1ActiveState, params: testGuideParams }]);

      // Create a plugin state
      await createPluginState(kibanaServer, {
        status: 'in_progress',
        creationDate: new Date().toISOString(),
      });

      const response = await supertest.get(getStatePath).expect(200);
      expect(response.body.pluginState.activeGuide.params).to.eql(testGuideParams);
    });
  });
}
