/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GetEventsOptions } from '@kbn/analytics-ftr-helpers-plugin/common/types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../services';

const DASHBOARD_LOADED_EVENT = 'dashboard_loaded';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ebtUIHelper = getService('kibana_ebt_ui');
  const PageObjects = getPageObjects([
    'common',
    'home',
    'header',
    'dashboard',
    'visEditor',
    'visualize',
  ]);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const queryBar = getService('queryBar');

  // Failing: See https://github.com/elastic/kibana/issues/142548
  describe.skip('Loaded Dashboard', () => {
    let fromTimestamp: string | undefined;

    const getEvents = async (count: number, options?: GetEventsOptions) =>
      ebtUIHelper.getEvents(count, {
        eventTypes: ['performance_metric'],
        fromTimestamp,
        withTimeoutMs: 1000,
        filters: { 'properties.eventName': { eq: DASHBOARD_LOADED_EVENT } },
        ...options,
      });

    const checkEmitsOnce = async (options?: GetEventsOptions) => {
      const events = await getEvents(Number.MAX_SAFE_INTEGER, options);
      const event = events[0];
      expect(event.event_type).to.eql('performance_metric');
      expect(event.properties.eventName).to.eql(DASHBOARD_LOADED_EVENT);
      expect(event.context.applicationId).to.be('dashboards');
      expect(event.context.page).to.be('app');
      expect(event.context.pageName).to.be('application:dashboards:app');
      expect(event.properties.duration).to.be.a('number');
      expect(event.properties.key1).to.eql('time_to_data');
      expect(event.properties.value1).to.be.a('number');
      expect(event.properties.key2).to.eql('num_of_panels');
      expect(event.properties.value2).to.be.a('number');

      // update fromTimestamp
      fromTimestamp = event.timestamp;

      return event;
    };

    const checkDoesNotEmit = async () => {
      const events = await getEvents(1);
      expect(events.length).to.be(0);
    };

    before(async () => {
      await PageObjects.common.navigateToApp('home');
      await PageObjects.home.goToSampleDataPage();
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.home.isSampleDataSetInstalled('flights');
    });

    after(async () => {
      await PageObjects.common.navigateToApp('home');
      await PageObjects.home.goToSampleDataPage();
      await PageObjects.home.removeSampleDataSet('flights');
    });

    describe('simple dashboard', () => {
      const SAVED_SEARCH_PANEL_TITLE = '[Flights] Flight Log';
      const VIS_PANEL_TITLE = '[Flights] Delay Buckets';
      const MAP_PANEL_TITLE = '[Flights] Origin Time Delayed';
      const MARKDOWN_PANEL_TITLE = 'Matrix';

      before(async () => {
        await PageObjects.common.navigateToApp('dashboards');
      });

      it("doesn't emit on empty dashboard", async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await checkDoesNotEmit();
      });

      it('does not emit on empty dashboard refreshed', async () => {
        await queryBar.clickQuerySubmitButton();
        await checkDoesNotEmit();
      });

      /**
       * Saved search embeddable
       */

      it('emits when saved search is added', async () => {
        await dashboardAddPanel.addSavedSearch(SAVED_SEARCH_PANEL_TITLE);
        const event = await checkEmitsOnce();

        expect(event.context.entityId).to.be('new');
        expect(event.properties.key2).to.be('num_of_panels');
        expect(event.properties.value2).to.be(1);
      });

      it('emits on saved search refreshed', async () => {
        await queryBar.clickQuerySubmitButton();
        await checkEmitsOnce();
      });

      it("doesn't emit when removing saved search panel", async () => {
        await dashboardPanelActions.removePanelByTitle(SAVED_SEARCH_PANEL_TITLE);
        await checkDoesNotEmit();
      });

      /**
       * Visualization embeddable
       */
      it('emits when visualization is added', async () => {
        await dashboardAddPanel.addVisualization(VIS_PANEL_TITLE);
        await checkEmitsOnce();
      });

      it('emits on visualization refreshed', async () => {
        await queryBar.clickQuerySubmitButton();
        await checkEmitsOnce();
      });

      it("doesn't emit when removing vis panel", async () => {
        await dashboardPanelActions.removePanelByTitle(VIS_PANEL_TITLE);
        await checkDoesNotEmit();
      });

      /**
       * Text embeddable
       */
      it('emits when markup is added', async () => {
        await dashboardAddPanel.clickAddMarkdownPanel();
        await PageObjects.visEditor.setMarkdownTxt('There is no spoon');
        await PageObjects.visEditor.clickGo();
        await PageObjects.visualize.saveVisualizationExpectSuccess(MARKDOWN_PANEL_TITLE, {
          saveAsNew: false,
          redirectToOrigin: true,
        });
        await checkEmitsOnce();
      });

      it('emits on markup refreshed', async () => {
        await queryBar.clickQuerySubmitButton();
        await checkEmitsOnce();
      });

      it("doesn't emit when removing markup panel", async () => {
        await dashboardPanelActions.removePanelByTitle(MARKDOWN_PANEL_TITLE);
        await checkDoesNotEmit();
      });

      /**
       * Map embeddable
       */
      it('emits when map is added', async () => {
        await dashboardAddPanel.addEmbeddable(MAP_PANEL_TITLE, 'map');
        await checkEmitsOnce({
          withTimeoutMs: 2500,
        });
      });

      it('emits on map refreshed', async () => {
        await queryBar.clickQuerySubmitButton();
        await checkEmitsOnce();
      });

      it("doesn't emit when removing map panel", async () => {
        await dashboardPanelActions.removePanelByTitle(MAP_PANEL_TITLE);
        await checkDoesNotEmit();
      });
    });

    describe('full loaded dashboard', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboards');
      });

      it('should emit the "Loaded Dashboard" event when done loading complex dashboard', async () => {
        await PageObjects.dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
        await PageObjects.dashboard.waitForRenderComplete();

        const event = await checkEmitsOnce();
        expect(event.context.entityId).to.be('7adfa750-4c81-11e8-b3d7-01146121b73d');

        expect(event.properties.key1).to.be('time_to_data');
        expect(event.properties.duration as number).to.be.greaterThan(
          event.properties.value1 as number
        );

        expect(event.properties.key2).to.be('num_of_panels');
        expect(event.properties.value2).to.be(16);
      });

      /**
       * Hit refresh
       */
      it('emits when hitting refresh', async () => {
        await queryBar.clickQuerySubmitButton();
        await PageObjects.dashboard.waitForRenderComplete();
        await checkEmitsOnce();
      });

      /**
       * Add query
       */
      it('emits when query is set', async () => {
        await queryBar.setQuery('Cancelled:false');
        await queryBar.clickQuerySubmitButton();
        await PageObjects.dashboard.waitForRenderComplete();
        await checkEmitsOnce();
      });
    });
  });
}
