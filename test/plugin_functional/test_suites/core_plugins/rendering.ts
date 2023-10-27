/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import expect from '@kbn/expect';

import '@kbn/core-provider-plugin/types';
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

const EXPOSED_CONFIG_SETTINGS_ERROR =
  'Actual config settings exposed to the browser do not match list defined in test; this assertion fails if extra settings are present and/or expected settings are missing';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const appsMenu = getService('appsMenu');
  const browser = getService('browser');
  const deployment = getService('deployment');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

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
      const injectedMetadata = document.querySelector('kbn-injected-metadata');
      // null/hasAttribute check and explicit error for better future troublehsooting
      // (see https://github.com/elastic/kibana/issues/167142)
      // The 'kbn-injected-metadata' tag that we're relying on here gets removed
      // some time after navigation (e.g. to /render/core). It appears that
      // occasionally this test fails to read the tag before it is removed.
      if (!injectedMetadata?.hasAttribute('data')) {
        throw new Error(`'kbn-injected-metadata.data' not found.`);
      }
      return JSON.parse(injectedMetadata.getAttribute('data')!);
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
    it('exposes plugin config settings to authenticated users', async () => {
      // This retry loop to get the injectedMetadata is to overcome flakiness
      // (see comment in getInjectedMetadata)
      let injectedMetadata: Partial<{ uiPlugins: any }> = { uiPlugins: undefined };
      await retry.waitFor('injectedMetadata', async () => {
        await navigateTo('/render/core');
        injectedMetadata = await getInjectedMetadata();
        return !!injectedMetadata;
      });

      expect(injectedMetadata).to.not.be.empty();
      expect(injectedMetadata.uiPlugins).to.not.be.empty();

      const actualExposedConfigKeys = [];
      for (const { plugin, exposedConfigKeys } of injectedMetadata.uiPlugins) {
        const configPath = Array.isArray(plugin.configPath)
          ? plugin.configPath.join('.')
          : plugin.configPath;
        for (const [exposedConfigKey, type] of Object.entries(exposedConfigKeys)) {
          actualExposedConfigKeys.push(`${configPath}.${exposedConfigKey} (${type})`);
        }
      }
      const expectedExposedConfigKeys = [
        // NOTE: each exposed config key has its schema type at the end in "(parentheses)". The schema type comes from Joi; in particular,
        // "(any)" can mean a few other data types. This is only intended to be a hint to make it easier for future reviewers to understand
        // what types of config settings can be exposed to the browser.
        // When plugin owners make a change that exposes additional config values, the changes will be reflected in this test assertion.
        // Ensure that your change does not unintentionally expose any sensitive values!
        'console.autocompleteDefinitions.endpointsAvailability (alternatives)',
        'console.ui.enabled (boolean)',
        'dashboard.allowByValueEmbeddables (boolean)',
        'unifiedSearch.autocomplete.querySuggestions.enabled (boolean)',
        'unifiedSearch.autocomplete.valueSuggestions.enabled (boolean)',
        'unifiedSearch.autocomplete.valueSuggestions.terminateAfter (duration)',
        'unifiedSearch.autocomplete.valueSuggestions.tiers (array)',
        'unifiedSearch.autocomplete.valueSuggestions.timeout (duration)',
        'data.search.aggs.shardDelay.enabled (boolean)',
        'data.search.asyncSearch.batchedReduceSize (number)',
        'data.search.asyncSearch.keepAlive (duration)',
        'data.search.asyncSearch.waitForCompletion (duration)',
        'data.search.asyncSearch.pollInterval (number)',
        'data.search.sessions.defaultExpiration (duration)',
        'data.search.sessions.enabled (boolean)',
        'data.search.sessions.management.expiresSoonWarning (duration)',
        'data.search.sessions.management.maxSessions (number)',
        'data.search.sessions.management.refreshInterval (duration)',
        'data.search.sessions.management.refreshTimeout (duration)',
        'data.search.sessions.maxUpdateRetries (number)',
        'data.search.sessions.notTouchedTimeout (duration)',
        'data_views.scriptedFieldsEnabled (any)', // It's a boolean (any because schema.conditional)
        'dev_tools.deeplinks.navLinkStatus (string)',
        'enterpriseSearch.canDeployEntSearch (boolean)',
        'enterpriseSearch.host (string)',
        'enterpriseSearch.ui.enabled (boolean)',
        'home.disableWelcomeScreen (boolean)',
        'management.deeplinks.navLinkStatus (string)',
        'map.emsFileApiUrl (string)',
        'map.emsFontLibraryUrl (string)',
        'map.emsLandingPageUrl (string)',
        'map.emsTileApiUrl (string)',
        'map.emsTileLayerId.bright (string)',
        'map.emsTileLayerId.dark (string)',
        'map.emsTileLayerId.desaturated (string)',
        'map.emsUrl (string)',
        'map.includeElasticMapsService (boolean)',
        'map.tilemap.options.attribution (string)',
        'map.tilemap.options.bounds (array)',
        'map.tilemap.options.default (boolean)',
        'map.tilemap.options.errorTileUrl (string)',
        'map.tilemap.options.maxZoom (number)',
        'map.tilemap.options.minZoom (number)',
        'map.tilemap.options.reuseTiles (boolean)',
        'map.tilemap.options.subdomains (array)',
        'map.tilemap.options.tileSize (number)',
        'map.tilemap.options.tms (boolean)',
        'map.tilemap.url (string)',
        'monitoring.kibana.collection.enabled (boolean)',
        'monitoring.kibana.collection.interval (number)',
        'monitoring.ui.ccs.enabled (boolean)',
        'monitoring.ui.kibana.reporting.stale_status_threshold_seconds (number)',
        'monitoring.ui.container.apm.enabled (boolean)',
        'monitoring.ui.container.elasticsearch.enabled (boolean)',
        'monitoring.ui.container.logstash.enabled (boolean)',
        'monitoring.ui.enabled (boolean)',
        'monitoring.ui.min_interval_seconds (number)',
        'monitoring.ui.show_license_expiration (boolean)',
        'newsfeed.fetchInterval (duration)',
        'newsfeed.mainInterval (duration)',
        'newsfeed.service.pathTemplate (string)',
        'newsfeed.service.urlRoot (string)',
        'no_data_page.analyticsNoDataPageFlavor (any)', // It's a string (any because schema.conditional)
        'telemetry.allowChangingOptInStatus (boolean)',
        'telemetry.appendServerlessChannelsSuffix (any)', // It's a boolean (any because schema.conditional)
        'telemetry.banner (boolean)',
        'telemetry.labels.branch (string)',
        'telemetry.labels.ciBuildId (string)',
        'telemetry.labels.ciBuildJobId (string)',
        'telemetry.labels.ciBuildNumber (number)',
        'telemetry.labels.ftrConfig (string)',
        'telemetry.labels.gitRev (string)',
        'telemetry.labels.isPr (boolean)',
        'telemetry.labels.journeyName (string)',
        'telemetry.labels.prId (number)',
        'telemetry.labels.testBuildId (string)',
        'telemetry.labels.testJobId (string)',
        'telemetry.labels.ciBuildName (string)',
        'telemetry.labels.performancePhase (string)',
        'telemetry.labels.serverless (any)', // It's the project type (string), claims any because schema.conditional. Can only be set on Serverless.
        'telemetry.hidePrivacyStatement (boolean)',
        'telemetry.optIn (boolean)',
        'telemetry.sendUsageFrom (alternatives)',
        'telemetry.sendUsageTo (any)',
        'usageCollection.uiCounters.debug (boolean)',
        'usageCollection.uiCounters.enabled (boolean)',
        // readOnly is boolean flag
        'input_control_vis.readOnly (any)',
        'vis_type_gauge.readOnly (any)',
        'vis_type_heatmap.readOnly (any)',
        'vis_type_metric.readOnly (any)',
        'vis_type_pie.readOnly (any)',
        'vis_type_table.readOnly (any)',
        'vis_type_tagcloud.readOnly (any)',
        'vis_type_timelion.readOnly (any)',
        'vis_type_timeseries.readOnly (any)',
        'vis_type_vislib.readOnly (any)',
        'vis_type_xy.readOnly (any)',
        'vis_type_vega.enableExternalUrls (boolean)',
        'xpack.actions.email.domain_allowlist (array)',
        'xpack.apm.serviceMapEnabled (boolean)',
        'xpack.apm.ui.enabled (boolean)',
        'xpack.apm.ui.maxTraceItems (number)',
        'xpack.apm.managedServiceUrl (any)',
        'xpack.apm.serverlessOnboarding (any)',
        'xpack.apm.latestAgentVersionsUrl (string)',
        'xpack.apm.featureFlags.agentConfigurationAvailable (any)',
        'xpack.apm.featureFlags.configurableIndicesAvailable (any)',
        'xpack.apm.featureFlags.infrastructureTabAvailable (any)',
        'xpack.apm.featureFlags.infraUiAvailable (any)',
        'xpack.apm.featureFlags.migrationToFleetAvailable (any)',
        'xpack.apm.featureFlags.sourcemapApiAvailable (any)',
        'xpack.apm.featureFlags.storageExplorerAvailable (any)',
        'xpack.apm.serverless.enabled (any)', // It's a boolean (any because schema.conditional)
        'xpack.assetManager.alphaEnabled (boolean)',
        'xpack.observability_onboarding.serverless.enabled (any)', // It's a boolean (any because schema.conditional)
        'xpack.cases.files.allowedMimeTypes (array)',
        'xpack.cases.files.maxSize (number)',
        'xpack.cases.markdownPlugins.lens (boolean)',
        'xpack.cases.stack.enabled (boolean)',
        'xpack.ccr.ui.enabled (boolean)',
        'xpack.cloud.base_url (string)',
        'xpack.cloud.cname (string)',
        'xpack.cloud.deployment_url (string)',
        'xpack.cloud.is_elastic_staff_owned (boolean)',
        'xpack.cloud.trial_end_date (string)',
        'xpack.cloud_integrations.chat.chatURL (string)',
        'xpack.cloud_integrations.chat.trialBuffer (number)',
        // No PII. This is an escape patch to override LaunchDarkly's flag resolution mechanism for testing or quick fix.
        'xpack.cloud_integrations.experiments.flag_overrides (record)',
        // Commented because it's inside a schema conditional, and the test is not able to resolve it. But it's shared.
        // Added here for documentation purposes.
        // 'xpack.cloud_integrations.experiments.launch_darkly.client_id (string)',
        // 'xpack.cloud_integrations.experiments.launch_darkly.client_log_level (string)',
        'xpack.cloud_integrations.experiments.metadata_refresh_interval (duration)',
        'xpack.cloud_integrations.full_story.org_id (any)',
        // No PII. Just the list of event types we want to forward to FullStory.
        'xpack.cloud_integrations.full_story.eventTypesAllowlist (array)',
        'xpack.cloud_integrations.gain_sight.org_id (any)',
        'xpack.cloud.id (string)',
        'xpack.cloud.organization_url (string)',
        'xpack.cloud.billing_url (string)',
        'xpack.cloud.profile_url (string)',
        'xpack.cloud.performance_url (string)',
        'xpack.cloud.users_and_roles_url (string)',
        'xpack.cloud.projects_url (any)', // It's a string (any because schema.conditional)
        // can't be used to infer urls or customer id from the outside
        'xpack.cloud.serverless.project_id (string)',
        'xpack.cloud.serverless.project_name (string)',
        'xpack.discoverEnhanced.actions.exploreDataInChart.enabled (boolean)',
        'xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled (boolean)',
        'xpack.fleet.agents.enabled (boolean)',
        'xpack.fleet.enableExperimental (array)',
        'xpack.fleet.internal.activeAgentsSoftLimit (number)',
        'xpack.fleet.internal.disableProxies (boolean)',
        'xpack.fleet.internal.fleetServerStandalone (boolean)',
        'xpack.fleet.internal.onlyAllowAgentUpgradeToKnownVersions (boolean)',
        'xpack.fleet.developer.maxAgentPoliciesWithInactivityTimeout (number)',
        'xpack.global_search.search_timeout (duration)',
        'xpack.graph.canEditDrillDownUrls (boolean)',
        'xpack.graph.savePolicy (alternatives)',
        'xpack.ilm.ui.enabled (boolean)',
        'xpack.index_management.ui.enabled (boolean)',
        'xpack.index_management.enableIndexActions (any)',
        'xpack.index_management.enableLegacyTemplates (any)',
        'xpack.index_management.enableIndexStats (any)',
        'xpack.index_management.editableIndexSettings (any)',
        'xpack.index_management.enableDataStreamsStorageColumn (any)',
        'xpack.infra.sources.default.fields.message (array)',
        /**
         * Feature flags bellow are conditional based on traditional/serverless offering
         * and will all resolve to xpack.infra.featureFlags.* (boolean)
         */
        'xpack.infra.featureFlags.metricsExplorerEnabled (any)',
        'xpack.infra.featureFlags.customThresholdAlertsEnabled (any)',
        'xpack.infra.featureFlags.osqueryEnabled (any)',
        'xpack.infra.featureFlags.inventoryThresholdAlertRuleEnabled (any)',
        'xpack.infra.featureFlags.metricThresholdAlertRuleEnabled (any)',
        'xpack.infra.featureFlags.logThresholdAlertRuleEnabled (any)',
        'xpack.infra.featureFlags.logsUIEnabled (any)',
        'xpack.infra.featureFlags.alertsAndRulesDropdownEnabled (any)',

        'xpack.license_management.ui.enabled (boolean)',
        'xpack.maps.preserveDrawingBuffer (boolean)',
        'xpack.maps.showMapsInspectorAdapter (boolean)',
        'xpack.ml.ad.enabled (boolean)',
        'xpack.ml.dfa.enabled (boolean)',
        'xpack.ml.nlp.enabled (boolean)',
        'xpack.osquery.actionEnabled (boolean)',
        'xpack.remote_clusters.ui.enabled (boolean)',
        /**
         * NOTE: The Reporting plugin is currently disabled in functional tests (see test/functional/config.base.js).
         * It will be re-enabled once #102552 is completed.
         */
        // 'xpack.reporting.roles.allow (array)',
        // 'xpack.reporting.roles.enabled (boolean)',
        // 'xpack.reporting.poll.jobCompletionNotifier.interval (number)',
        // 'xpack.reporting.poll.jobCompletionNotifier.intervalErrorMultiplier (number)',
        // 'xpack.reporting.poll.jobsRefresh.interval (number)',
        // 'xpack.reporting.poll.jobsRefresh.intervalErrorMultiplier (number)',
        'xpack.rollup.ui.enabled (boolean)',
        'xpack.saved_object_tagging.cache_refresh_interval (duration)',
        'xpack.security.loginAssistanceMessage (string)',
        'xpack.security.sameSiteCookies (alternatives)',
        'xpack.security.showInsecureClusterWarning (boolean)',
        'xpack.security.showNavLinks (boolean)',
        'xpack.security.ui (any)',
        'xpack.spaces.maxSpaces (number)',
        'xpack.spaces.allowFeatureVisibility (any)',
        'xpack.securitySolution.enableExperimental (array)',
        'xpack.securitySolution.prebuiltRulesPackageVersion (string)',
        'xpack.securitySolution.offeringSettings (record)',
        'xpack.snapshot_restore.slm_ui.enabled (boolean)',
        'xpack.snapshot_restore.ui.enabled (boolean)',
        'xpack.stack_connectors.enableExperimental (array)',
        'xpack.trigger_actions_ui.enableExperimental (array)',
        'xpack.trigger_actions_ui.enableGeoTrackingThresholdAlert (boolean)',
        'xpack.upgrade_assistant.featureSet.migrateSystemIndices (boolean)',
        'xpack.upgrade_assistant.featureSet.mlSnapshots (boolean)',
        'xpack.upgrade_assistant.featureSet.reindexCorrectiveActions (boolean)',
        'xpack.upgrade_assistant.ui.enabled (boolean)',
        'xpack.observability.unsafe.alertDetails.metrics.enabled (boolean)',
        'xpack.observability.unsafe.alertDetails.logs.enabled (boolean)',
        'xpack.observability.unsafe.alertDetails.uptime.enabled (boolean)',
        'xpack.observability.unsafe.alertDetails.observability.enabled (boolean)',
        'xpack.observability.unsafe.thresholdRule.enabled (any)', // conditional, is actually a boolean
        'xpack.observability_onboarding.ui.enabled (boolean)',
        'xpack.observabilityLogExplorer.navigation.showAppLink (any)', // conditional, is actually a boolean
      ];
      // We don't assert that actualExposedConfigKeys and expectedExposedConfigKeys are equal, because test failure messages with large
      // arrays are hard to grok. Instead, we take the difference between the two arrays and assert them separately, that way it's
      // abundantly clear when the test fails that (A) Kibana is exposing a new key, or (B) Kibana is no longer exposing a key.
      const extra = _.difference(actualExposedConfigKeys, expectedExposedConfigKeys).sort();
      const missing = _.difference(expectedExposedConfigKeys, actualExposedConfigKeys).sort();

      expect({ extra, missing }).to.eql({ extra: [], missing: [] }, EXPOSED_CONFIG_SETTINGS_ERROR);
    });

    it('exposes plugin config settings to unauthenticated users', async () => {
      // This retry loop to get the injectedMetadata is to overcome flakiness
      // (see comment in getInjectedMetadata)
      let injectedMetadata: Partial<{ uiPlugins: any }> = { uiPlugins: undefined };
      await retry.waitFor('injectedMetadata', async () => {
        await navigateTo('/render/core?isAnonymousPage=true');
        injectedMetadata = await getInjectedMetadata();
        return !!injectedMetadata;
      });
      expect(injectedMetadata).to.not.be.empty();
      expect(injectedMetadata.uiPlugins).to.not.be.empty();

      const actualExposedConfigKeys = [];
      for (const { plugin, exposedConfigKeys } of injectedMetadata.uiPlugins) {
        const configPath = Array.isArray(plugin.configPath)
          ? plugin.configPath.join('.')
          : plugin.configPath;
        for (const [exposedConfigKey, type] of Object.entries(exposedConfigKeys)) {
          actualExposedConfigKeys.push(`${configPath}.${exposedConfigKey} (${type})`);
        }
      }
      const expectedExposedConfigKeys = [
        // NOTE: each exposed config key has its schema type at the end in "(parentheses)". The schema type comes from Joi; in particular,
        // "(any)" can mean a few other data types. This is only intended to be a hint to make it easier for future reviewers to understand
        // what types of config settings can be exposed to the browser.
        // When plugin owners make a change that exposes additional config values, the changes will be reflected in this test assertion.
        // Ensure that your change does not unintentionally expose any sensitive values!
        'xpack.security.loginAssistanceMessage (string)',
        'xpack.security.sameSiteCookies (alternatives)',
        'xpack.security.showInsecureClusterWarning (boolean)',
        'xpack.security.showNavLinks (boolean)',
        'xpack.security.ui (any)',

        'telemetry.allowChangingOptInStatus (boolean)',
        'telemetry.appendServerlessChannelsSuffix (any)', // It's a boolean (any because schema.conditional)
        'telemetry.banner (boolean)',
        'telemetry.labels.branch (string)',
        'telemetry.labels.ciBuildId (string)',
        'telemetry.labels.ciBuildJobId (string)',
        'telemetry.labels.ciBuildNumber (number)',
        'telemetry.labels.ftrConfig (string)',
        'telemetry.labels.gitRev (string)',
        'telemetry.labels.isPr (boolean)',
        'telemetry.labels.journeyName (string)',
        'telemetry.labels.prId (number)',
        'telemetry.labels.testBuildId (string)',
        'telemetry.labels.testJobId (string)',
        'telemetry.labels.ciBuildName (string)',
        'telemetry.labels.performancePhase (string)',
        'telemetry.labels.serverless (any)', // It's the project type (string), claims any because schema.conditional. Can only be set on Serverless.
        'telemetry.hidePrivacyStatement (boolean)',
        'telemetry.optIn (boolean)',
        'telemetry.sendUsageFrom (alternatives)',
        'telemetry.sendUsageTo (any)',
        'usageCollection.uiCounters.debug (boolean)',
        'usageCollection.uiCounters.enabled (boolean)',
      ];
      // We don't assert that actualExposedConfigKeys and expectedExposedConfigKeys are equal, because test failure messages with large
      // arrays are hard to grok. Instead, we take the difference between the two arrays and assert them separately, that way it's
      // abundantly clear when the test fails that (A) Kibana is exposing a new key, or (B) Kibana is no longer exposing a key.
      const extra = _.difference(actualExposedConfigKeys, expectedExposedConfigKeys).sort();
      const missing = _.difference(expectedExposedConfigKeys, actualExposedConfigKeys).sort();
      expect({ extra, missing }).to.eql({ extra: [], missing: [] }, EXPOSED_CONFIG_SETTINGS_ERROR);
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
      await navigateTo('/render/core?isAnonymousPage=true');

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
