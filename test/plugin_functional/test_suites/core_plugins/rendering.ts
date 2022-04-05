/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import '../../plugins/core_provider_plugin/types';
import { PluginFunctionalProviderContext } from '../../services';

declare global {
  interface Window {
    /**
     * We use this global variable to track page history changes to ensure that
     * navigation is done without causing a full page reload.
     */
    __RENDERING_SESSION__: string[];
  }
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const appsMenu = getService('appsMenu');
  const browser = getService('browser');
  const deployment = getService('deployment');
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  const navigateTo = async (path: string) =>
    await browser.navigateTo(`${deployment.getHostPort()}${path}`);
  const navigateToApp = async (title: string) => {
    await appsMenu.clickLink(title);
    return browser.execute(() => {
      if (!('__RENDERING_SESSION__' in window)) {
        window.__RENDERING_SESSION__ = [];
      }

      window.__RENDERING_SESSION__.push(window.location.pathname);
    });
  };

  const getInjectedMetadata = () =>
    browser.execute(() => {
      return JSON.parse(document.querySelector('kbn-injected-metadata')!.getAttribute('data')!);
    });
  const getUserSettings = () =>
    browser.execute(() => {
      return JSON.parse(document.querySelector('kbn-injected-metadata')!.getAttribute('data')!)
        .legacyMetadata.uiSettings.user;
    });
  const exists = (selector: string) => testSubjects.exists(selector, { timeout: 5000 });
  const findLoadingMessage = () => testSubjects.find('kbnLoadingMessage', 5000);
  const getRenderingSession = () =>
    browser.execute(() => {
      return window.__RENDERING_SESSION__;
    });

  describe('rendering service', () => {
    it('exposes plugin config settings', async () => {
      await navigateTo('/render/core');
      const injectedMetadata = await getInjectedMetadata();
      expect(injectedMetadata).to.not.be.empty();
      expect(injectedMetadata.uiPlugins).to.not.be.empty();

      const allExposedConfigKeys = [];
      for (const { plugin, exposedConfigKeys } of injectedMetadata.uiPlugins) {
        const configPath = Array.isArray(plugin.configPath)
          ? plugin.configPath.join('.')
          : plugin.configPath;
        for (const [exposedConfigKey, type] of Object.entries(exposedConfigKeys)) {
          allExposedConfigKeys.push(`${configPath}.${exposedConfigKey} (${type})`);
        }
      }
      expect(allExposedConfigKeys.sort()).to.eql([
        // NOTE: each exposed config key has its schema type at the end in "(parentheses)".
        // The schema type comes from Joi; in particular, "(any)" can mean a string or a few other data types.
        // When plugin owners make a change that exposes additional config values, the changes will be reflected in this test assertion.
        // Ensure that your change does not unintentionally expose any sensitive values!
        'console.ui.enabled (boolean)',
        'dashboard.allowByValueEmbeddables (boolean)',
        'data.autocomplete.querySuggestions.enabled (boolean)',
        'data.autocomplete.valueSuggestions.enabled (boolean)',
        'data.autocomplete.valueSuggestions.terminateAfter (duration)',
        'data.autocomplete.valueSuggestions.tiers (array)',
        'data.autocomplete.valueSuggestions.timeout (duration)',
        'data.search.aggs.shardDelay.enabled (boolean)',
        'enterpriseSearch.host (any)',
        'home.disableWelcomeScreen (boolean)',
        'map.emsFileApiUrl (any)',
        'map.emsFontLibraryUrl (any)',
        'map.emsLandingPageUrl (any)',
        'map.emsTileApiUrl (any)',
        'map.emsTileLayerId.bright (any)',
        'map.emsTileLayerId.dark (any)',
        'map.emsTileLayerId.desaturated (any)',
        'map.emsUrl (any)',
        'map.includeElasticMapsService (boolean)',
        'map.tilemap.options.attribution (any)',
        'map.tilemap.options.bounds (array)',
        'map.tilemap.options.default (boolean)',
        'map.tilemap.options.errorTileUrl (any)',
        'map.tilemap.options.maxZoom (number)',
        'map.tilemap.options.minZoom (number)',
        'map.tilemap.options.reuseTiles (boolean)',
        'map.tilemap.options.subdomains (array)',
        'map.tilemap.options.tileSize (number)',
        'map.tilemap.options.tms (boolean)',
        'map.tilemap.url (any)',
        'monitoring.kibana.collection.enabled (boolean)',
        'monitoring.kibana.collection.interval (number)',
        'monitoring.ui.ccs.enabled (boolean)',
        'monitoring.ui.container.apm.enabled (boolean)',
        'monitoring.ui.container.elasticsearch.enabled (boolean)',
        'monitoring.ui.container.logstash.enabled (boolean)',
        'monitoring.ui.enabled (boolean)',
        'monitoring.ui.min_interval_seconds (number)',
        'monitoring.ui.show_license_expiration (boolean)',
        'newsfeed.fetchInterval (duration)',
        'newsfeed.mainInterval (duration)',
        'newsfeed.service.pathTemplate (any)',
        'newsfeed.service.urlRoot (any)',
        'telemetry.allowChangingOptInStatus (boolean)',
        'telemetry.banner (boolean)',
        'telemetry.enabled (boolean)',
        'telemetry.optIn (any)',
        'telemetry.sendUsageFrom (alternatives)',
        'telemetry.sendUsageTo (any)',
        'usageCollection.uiCounters.debug (boolean)',
        'usageCollection.uiCounters.enabled (boolean)',
        'vis_type_vega.enableExternalUrls (boolean)',
        'xpack.apm.profilingEnabled (boolean)',
        'xpack.apm.serviceMapEnabled (boolean)',
        'xpack.apm.ui.enabled (boolean)',
        'xpack.apm.ui.maxTraceItems (number)',
        'xpack.apm.ui.transactionGroupBucketSize (number)',
        'xpack.cases.markdownPlugins.lens (boolean)',
        'xpack.ccr.ui.enabled (boolean)',
        'xpack.cloud.base_url (any)',
        'xpack.cloud.chat.chatURL (any)',
        'xpack.cloud.chat.enabled (boolean)',
        'xpack.cloud.cname (any)',
        'xpack.cloud.deployment_url (any)',
        'xpack.cloud.full_story.enabled (boolean)',
        'xpack.cloud.full_story.org_id (any)',
        'xpack.cloud.id (any)',
        'xpack.cloud.organization_url (any)',
        'xpack.cloud.profile_url (any)',
        'xpack.data_enhanced.search.sessions.cleanupInterval (duration)',
        'xpack.data_enhanced.search.sessions.defaultExpiration (duration)',
        'xpack.data_enhanced.search.sessions.enabled (boolean)',
        'xpack.data_enhanced.search.sessions.expireInterval (duration)',
        'xpack.data_enhanced.search.sessions.management.expiresSoonWarning (duration)',
        'xpack.data_enhanced.search.sessions.management.maxSessions (number)',
        'xpack.data_enhanced.search.sessions.management.refreshInterval (duration)',
        'xpack.data_enhanced.search.sessions.management.refreshTimeout (duration)',
        'xpack.data_enhanced.search.sessions.maxUpdateRetries (number)',
        'xpack.data_enhanced.search.sessions.monitoringTaskTimeout (duration)',
        'xpack.data_enhanced.search.sessions.notTouchedInProgressTimeout (duration)',
        'xpack.data_enhanced.search.sessions.notTouchedTimeout (duration)',
        'xpack.data_enhanced.search.sessions.pageSize (number)',
        'xpack.data_enhanced.search.sessions.trackingInterval (duration)',
        'xpack.discoverEnhanced.actions.exploreDataInChart.enabled (boolean)',
        'xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled (boolean)',
        'xpack.fleet.agents.elasticsearch.ca_sha256 (any)',
        'xpack.fleet.agents.elasticsearch.hosts (array)',
        'xpack.fleet.agents.enabled (boolean)',
        'xpack.fleet.agents.fleet_server.hosts (array)',
        'xpack.global_search.search_timeout (duration)',
        'xpack.graph.canEditDrillDownUrls (boolean)',
        'xpack.graph.savePolicy (alternatives)',
        'xpack.ilm.ui.enabled (boolean)',
        'xpack.index_management.ui.enabled (boolean)',
        'xpack.infra.sources.default.fields.message (array)',
        'xpack.license_management.ui.enabled (boolean)',
        'xpack.maps.preserveDrawingBuffer (boolean)',
        'xpack.maps.showMapsInspectorAdapter (boolean)',
        'xpack.observability.unsafe.alertingExperience.enabled (boolean)',
        'xpack.observability.unsafe.cases.enabled (boolean)',
        'xpack.observability.unsafe.overviewNext.enabled (boolean)',
        'xpack.observability.unsafe.rules.enabled (boolean)',
        'xpack.osquery.actionEnabled (boolean)',
        'xpack.osquery.packs (boolean)',
        'xpack.osquery.savedQueries (boolean)',
        'xpack.remote_clusters.ui.enabled (boolean)',
        /**
         * NOTE: The Reporting plugin is currently disabled in functional tests (see test/functional/config.js).
         * It will be re-enabled once #102552 is completed.
         */
        // 'xpack.reporting.roles.enabled (boolean)',
        // 'xpack.reporting.roles.allow (array)',
        // 'xpack.reporting.poll.jobCompletionNotifier.interval (number)',
        // 'xpack.reporting.poll.jobCompletionNotifier.intervalErrorMultiplier (number)',
        // 'xpack.reporting.poll.jobsRefresh.interval (number)',
        // 'xpack.reporting.poll.jobsRefresh.intervalErrorMultiplier (number)',
        'xpack.rollup.ui.enabled (boolean)',
        'xpack.saved_object_tagging.cache_refresh_interval (duration)',
        'xpack.security.loginAssistanceMessage (any)',
        'xpack.security.sameSiteCookies (alternatives)',
        'xpack.security.showInsecureClusterWarning (boolean)',
        'xpack.securitySolution.enableExperimental (array)',
        'xpack.snapshot_restore.slm_ui.enabled (boolean)',
        'xpack.snapshot_restore.ui.enabled (boolean)',
        'xpack.trigger_actions_ui.enableExperimental (array)',
        'xpack.trigger_actions_ui.enableGeoTrackingThresholdAlert (boolean)',
        'xpack.upgrade_assistant.readonly (boolean)',
        'xpack.upgrade_assistant.ui.enabled (boolean)',
      ]);
    });

    // FLAKY
    it.skip('renders "core" application', async () => {
      await navigateTo('/render/core');

      const [loadingMessage, userSettings] = await Promise.all([
        findLoadingMessage(),
        getUserSettings(),
      ]);

      expect(userSettings).to.not.be.empty();

      await find.waitForElementStale(loadingMessage);

      expect(await exists('renderingHeader')).to.be(true);
    });

    // FLAKY
    it.skip('renders "core" application without user settings', async () => {
      await navigateTo('/render/core?includeUserSettings=false');

      const [loadingMessage, userSettings] = await Promise.all([
        findLoadingMessage(),
        getUserSettings(),
      ]);

      expect(userSettings).to.be.empty();

      await find.waitForElementStale(loadingMessage);

      expect(await exists('renderingHeader')).to.be(true);
    });

    // FLAKY
    it.skip('navigates between standard application and one with custom appRoute', async () => {
      await navigateTo('/');
      await find.waitForElementStale(await findLoadingMessage());

      await navigateToApp('App Status');
      expect(await exists('appStatusApp')).to.be(true);
      expect(await exists('renderingHeader')).to.be(false);

      await navigateToApp('Rendering');
      expect(await exists('appStatusApp')).to.be(false);
      expect(await exists('renderingHeader')).to.be(true);

      await navigateToApp('App Status');
      expect(await exists('appStatusApp')).to.be(true);
      expect(await exists('renderingHeader')).to.be(false);

      expect(await getRenderingSession()).to.eql([
        '/app/app_status',
        '/render/core',
        '/app/app_status',
      ]);
    });

    // FLAKY
    it.skip('navigates between applications with custom appRoutes', async () => {
      await navigateTo('/');
      await find.waitForElementStale(await findLoadingMessage());

      await navigateToApp('Rendering');
      expect(await exists('renderingHeader')).to.be(true);
      expect(await exists('customAppRouteHeader')).to.be(false);

      await navigateToApp('Custom App Route');
      expect(await exists('customAppRouteHeader')).to.be(true);
      expect(await exists('renderingHeader')).to.be(false);

      await navigateToApp('Rendering');
      expect(await exists('renderingHeader')).to.be(true);
      expect(await exists('customAppRouteHeader')).to.be(false);

      expect(await getRenderingSession()).to.eql([
        '/render/core',
        '/custom/appRoute',
        '/render/core',
      ]);
    });
  });
}
