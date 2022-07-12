/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GetEventsOptions } from '@kbn/analytics-ftr-helpers-plugin/common/types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../services';

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

  describe('Loaded Dashboard', () => {
    let fromTimestamp: string | undefined;

    const getEvents = async (count: number, options?: GetEventsOptions) =>
      ebtUIHelper.getEvents(count, {
        eventTypes: ['dashboard-data-loaded'],
        fromTimestamp,
        withTimeoutMs: 1000,
        ...options,
      });

    const checkEmitsOnce = async (options?: GetEventsOptions) => {
      const events = await getEvents(Number.MAX_SAFE_INTEGER, options);
      expect(events.length).to.be(1);
      const event = events[0];
      expect(event.event_type).to.eql('dashboard-data-loaded');
      expect(event.context.applicationId).to.be('dashboards');
      expect(event.context.page).to.be('app');
      expect(event.context.pageName).to.be('application:dashboards:app');
      expect(event.properties.status).to.be('done');
      expect(event.properties.timeToData).to.be.a('number');
      expect(event.properties.timeToDone).to.be.a('number');

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

      it('doesnt emit on empty dashboard', async () => {
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
        expect(event.properties.numOfPanels).to.be(1);
      });

      it('emits on saved search refreshed', async () => {
        await queryBar.clickQuerySubmitButton();
        await checkEmitsOnce();
      });

      it('doesnt emit when removing saved search panel', async () => {
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

      it('doesnt emit when removing vis panel', async () => {
        await dashboardPanelActions.removePanelByTitle(VIS_PANEL_TITLE);
        await checkDoesNotEmit();
      });

      /**
       * Text embeddable
       */
      it('emits when markup is added', async () => {
        await dashboardAddPanel.clickMarkdownQuickButton();
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

      it('doesnt emit when removing markup panel', async () => {
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

      it('doesnt emit when removing map panel', async () => {
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
        expect(event.properties.numOfPanels).to.be(17);
        expect(event.properties.timeToDone as number).to.be.greaterThan(
          event.properties.timeToData as number
        );
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
