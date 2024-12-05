/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    __RENDERING_SESSION__?: string[];
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

      window.__RENDERING_SESSION__!.push(window.location.pathname);
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
        'console.autocompleteDefinitions.endpointsAvailability (stack?|serverless?)',
        'console.ui.enabled (boolean?)',
        'console.ui.embeddedEnabled (boolean?)',
        'dashboard.allowByValueEmbeddables (boolean?)',
        'unifiedSearch.autocomplete.querySuggestions.enabled (boolean?)',
        'unifiedSearch.autocomplete.valueSuggestions.enabled (boolean?)',
        'unifiedSearch.autocomplete.valueSuggestions.terminateAfter (duration?)',
        'unifiedSearch.autocomplete.valueSuggestions.tiers (array?)',
        'unifiedSearch.autocomplete.valueSuggestions.timeout (duration?)',
        'data.search.aggs.shardDelay.enabled (boolean?)',
        'data.search.asyncSearch.batchedReduceSize (number?)',
        'data.search.asyncSearch.keepAlive (duration?)',
        'data.search.asyncSearch.waitForCompletion (duration?)',
        'data.search.asyncSearch.pollInterval (number?)',
        'data.search.sessions.defaultExpiration (duration?)',
        'data.search.sessions.enabled (boolean?)',
        'data.search.sessions.management.expiresSoonWarning (duration?)',
        'data.search.sessions.management.maxSessions (number?)',
        'data.search.sessions.management.refreshInterval (duration?)',
        'data.search.sessions.management.refreshTimeout (duration?)',
        'data.search.sessions.maxUpdateRetries (number?)',
        'data.search.sessions.notTouchedTimeout (duration?)',
        'data.query.timefilter.minRefreshInterval (number?)',
        'data_views.scriptedFieldsEnabled (boolean?|never)',
        'data_visualizer.resultLinks.fileBeat.enabled (boolean)',
        'dev_tools.deeplinks.navLinkStatus (string?)',
        'discover.experimental.enabledProfiles (array?)',
        'enterpriseSearch.canDeployEntSearch (boolean?)',
        'enterpriseSearch.host (string?)',
        'enterpriseSearch.ui.enabled (boolean?)',
        'home.disableWelcomeScreen (boolean?)',
        'management.deeplinks.navLinkStatus (string?)',
        'map.emsFileApiUrl (string?)',
        'map.emsFontLibraryUrl (string?)',
        'map.emsLandingPageUrl (string?)',
        'map.emsTileApiUrl (string?)',
        'map.emsTileLayerId.bright (string?)',
        'map.emsTileLayerId.dark (string?)',
        'map.emsTileLayerId.desaturated (string?)',
        'map.emsUrl (string?)',
        'map.includeElasticMapsService (boolean?)',
        'map.tilemap.options.attribution (string?)',
        'map.tilemap.options.bounds (array?)',
        'map.tilemap.options.default (boolean?)',
        'map.tilemap.options.errorTileUrl (string?)',
        'map.tilemap.options.maxZoom (number?)',
        'map.tilemap.options.minZoom (number?)',
        'map.tilemap.options.reuseTiles (boolean?)',
        'map.tilemap.options.subdomains (array?)',
        'map.tilemap.options.tileSize (number?)',
        'map.tilemap.options.tms (boolean?)',
        'map.tilemap.url (string?)',
        'monitoring.kibana.collection.enabled (boolean?)',
        'monitoring.kibana.collection.interval (number?)',
        'monitoring.ui.ccs.enabled (boolean?)',
        'monitoring.ui.kibana.reporting.stale_status_threshold_seconds (number?)',
        'monitoring.ui.container.apm.enabled (boolean?)',
        'monitoring.ui.container.elasticsearch.enabled (boolean?)',
        'monitoring.ui.container.logstash.enabled (boolean?)',
        'monitoring.ui.enabled (boolean?)',
        'monitoring.ui.min_interval_seconds (number?)',
        'monitoring.ui.show_license_expiration (boolean?)',
        'monitoring.ui.logs.index (string?)',
        'newsfeed.fetchInterval (duration?)',
        'newsfeed.mainInterval (duration?)',
        'newsfeed.service.pathTemplate (string?)',
        'newsfeed.service.urlRoot (string?)',
        'no_data_page.analyticsNoDataPageFlavor (kibana?|serverless_search?|serverless_observability?|never)',
        'telemetry.allowChangingOptInStatus (boolean?)',
        'telemetry.appendServerlessChannelsSuffix (true?|false?)',
        'telemetry.banner (boolean?)',
        'telemetry.labels.branch (string?)',
        'telemetry.labels.ciBuildId (string?)',
        'telemetry.labels.ciBuildJobId (string?)',
        'telemetry.labels.ciBuildNumber (number?)',
        'telemetry.labels.environment (string?)',
        'telemetry.labels.ftrConfig (string?)',
        'telemetry.labels.gitRev (string?)',
        'telemetry.labels.isPr (boolean?)',
        'telemetry.labels.journeyName (string?)',
        'telemetry.labels.prId (number?)',
        'telemetry.labels.testBuildId (string?)',
        'telemetry.labels.testJobId (string?)',
        'telemetry.labels.ciBuildName (string?)',
        'telemetry.labels.performancePhase (string?)',
        'telemetry.labels.serverless (string?|never)', // Can only be set on Serverless.
        'telemetry.hidePrivacyStatement (boolean?)',
        'telemetry.optIn (boolean?)',
        'telemetry.sendUsageFrom (server?|browser?)',
        'telemetry.sendUsageTo (prod?|staging?)',
        'usageCollection.uiCounters.debug (boolean?)',
        'usageCollection.uiCounters.enabled (boolean?)',
        'input_control_vis.readOnly (boolean?|never)',
        'vis_type_gauge.readOnly (boolean?|never)',
        'vis_type_heatmap.readOnly (boolean?|never)',
        'vis_type_metric.readOnly (boolean?|never)',
        'vis_type_pie.readOnly (boolean?|never)',
        'vis_type_table.readOnly (boolean?|never)',
        'vis_type_tagcloud.readOnly (boolean?|never)',
        'vis_type_timelion.readOnly (boolean?|never)',
        'vis_type_timeseries.readOnly (boolean?|never)',
        'vis_type_vislib.readOnly (boolean?|never)',
        'vis_type_xy.readOnly (boolean?|never)',
        'vis_type_vega.enableExternalUrls (boolean?)',
        'xpack.actions.email.domain_allowlist (array)',
        'xpack.apm.serviceMapEnabled (boolean?)',
        'xpack.apm.ui.enabled (boolean?)',
        'xpack.apm.ui.maxTraceItems (number?)',
        'xpack.apm.managedServiceUrl (string?|never)',
        'xpack.apm.serverlessOnboarding (boolean?|never)',
        'xpack.apm.latestAgentVersionsUrl (string?)',
        'xpack.apm.featureFlags.agentConfigurationAvailable (boolean?|true?)',
        'xpack.apm.featureFlags.configurableIndicesAvailable (boolean?|true?)',
        'xpack.apm.featureFlags.infrastructureTabAvailable (boolean?|true?)',
        'xpack.apm.featureFlags.infraUiAvailable (boolean?|true?)',
        'xpack.apm.featureFlags.migrationToFleetAvailable (boolean?|true?)',
        'xpack.apm.featureFlags.sourcemapApiAvailable (boolean?|true?)',
        'xpack.apm.featureFlags.storageExplorerAvailable (boolean?|true?)',
        'xpack.apm.featureFlags.profilingIntegrationAvailable (boolean?)',
        'xpack.apm.serverless.enabled (true?|never)',
        'xpack.observability_onboarding.serverless.enabled (true?|never)',
        'xpack.cases.files.allowedMimeTypes (array?)',
        'xpack.cases.files.maxSize (number?)',
        'xpack.cases.markdownPlugins.lens (boolean?)',
        'xpack.cases.stack.enabled (boolean?)',
        'xpack.ccr.ui.enabled (boolean?)',
        'xpack.cloud.base_url (string?)',
        'xpack.cloud.cname (string?)',
        'xpack.cloud.csp (string?)',
        'xpack.cloud.deployment_url (string?)',
        'xpack.cloud.deployments_url (string?)',
        'xpack.cloud.is_elastic_staff_owned (boolean?)',
        'xpack.cloud.trial_end_date (string?)',
        // Commented because it's inside a schema conditional, and the test is not able to resolve it. But it's shared.
        // Added here for documentation purposes.
        // 'xpack.cloud_integrations.experiments.launch_darkly.client_id (string)',
        // 'xpack.cloud_integrations.experiments.launch_darkly.client_log_level (string)',
        'xpack.cloud_integrations.experiments.metadata_refresh_interval (duration?)',
        'xpack.cloud_integrations.full_story.org_id (string|string?)',
        // No PII. Just the list of event types we want to forward to FullStory.
        'xpack.cloud_integrations.full_story.eventTypesAllowlist (array?)',
        'xpack.cloud_integrations.full_story.pageVarsDebounceTime (duration?)',
        'xpack.cloud.id (string?)',
        'xpack.cloud.organization_id (string?)',
        'xpack.cloud.organization_url (string?)',
        'xpack.cloud.billing_url (string?)',
        'xpack.cloud.profile_url (string?)',
        'xpack.cloud.performance_url (string?)',
        'xpack.cloud.users_and_roles_url (string?)',
        'xpack.cloud.projects_url (string?|never)',
        // can't be used to infer urls or customer id from the outside
        'xpack.cloud.serverless.project_id (string?)',
        'xpack.cloud.serverless.project_name (string?)',
        'xpack.cloud.serverless.project_type (string?)',
        'xpack.cloud.serverless.orchestrator_target (string?)',
        'xpack.cloud.onboarding.default_solution (string?)',
        'xpack.discoverEnhanced.actions.exploreDataInChart.enabled (boolean?)',
        'xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled (boolean?)',
        'xpack.fleet.agents.enabled (boolean?)',
        'xpack.fleet.agentless.enabled (boolean?)',
        'xpack.fleet.enableExperimental (array?)',
        'xpack.fleet.internal.activeAgentsSoftLimit (number?)',
        'xpack.fleet.internal.fleetServerStandalone (boolean?)',
        'xpack.fleet.internal.onlyAllowAgentUpgradeToKnownVersions (boolean?)',
        'xpack.fleet.developer.maxAgentPoliciesWithInactivityTimeout (number?)',
        'xpack.global_search.search_timeout (duration?)',
        'xpack.global_search_bar.input_max_limit (number?)',
        'xpack.graph.canEditDrillDownUrls (boolean?)',
        'xpack.graph.savePolicy (none?|config?|configAndData?|configAndDataWithConsent?)',
        'xpack.ilm.ui.enabled (boolean?)',
        'xpack.index_management.ui.enabled (boolean?)',
        'xpack.infra.sources.default.fields.message (array?)',
        'xpack.index_management.enableTogglingDataRetention (boolean?|never)',
        'xpack.index_management.enableProjectLevelRetentionChecks (boolean?|never)',
        'xpack.integration_assistant.enableExperimental (array?)',
        /**
         * Feature flags bellow are conditional based on traditional/serverless offering
         */
        'xpack.infra.featureFlags.metricsExplorerEnabled (boolean?)',
        'xpack.infra.featureFlags.customThresholdAlertsEnabled (boolean?)',
        'xpack.infra.featureFlags.osqueryEnabled (boolean?)',
        'xpack.infra.featureFlags.inventoryThresholdAlertRuleEnabled (boolean?)',
        'xpack.infra.featureFlags.metricThresholdAlertRuleEnabled (boolean?)',
        'xpack.infra.featureFlags.logThresholdAlertRuleEnabled (boolean?)',
        'xpack.infra.featureFlags.logsUIEnabled (boolean?)',
        'xpack.infra.featureFlags.alertsAndRulesDropdownEnabled (boolean?)',
        'xpack.infra.featureFlags.profilingEnabled (boolean?)',

        'xpack.index_management.enableIndexActions (boolean?|never)',
        'xpack.index_management.enableLegacyTemplates (boolean?|never)',
        'xpack.index_management.enableIndexStats (boolean?|never)',
        'xpack.index_management.enableDataStreamStats (boolean?|never)',
        'xpack.index_management.enableSizeAndDocCount (boolean?|never)',
        'xpack.index_management.editableIndexSettings (all?|limited?|never)',
        'xpack.index_management.enableMappingsSourceFieldSection (boolean?|never)',
        'xpack.index_management.dev.enableSemanticText (boolean?)',
        'xpack.license_management.ui.enabled (boolean?)',
        'xpack.maps.preserveDrawingBuffer (boolean?)',
        'xpack.maps.showMapsInspectorAdapter (boolean?)',
        'xpack.ml.ad.enabled (boolean)',
        'xpack.ml.dfa.enabled (boolean)',
        'xpack.ml.nlp.enabled (boolean)',
        'xpack.ml.nlp.modelDeployment.allowStaticAllocations (boolean)',
        'xpack.ml.nlp.modelDeployment.vCPURange.high.max (number)',
        'xpack.ml.nlp.modelDeployment.vCPURange.high.min (number)',
        'xpack.ml.nlp.modelDeployment.vCPURange.high.static (number?)',
        'xpack.ml.nlp.modelDeployment.vCPURange.low.max (number)',
        'xpack.ml.nlp.modelDeployment.vCPURange.low.min (number)',
        'xpack.ml.nlp.modelDeployment.vCPURange.low.static (number?)',
        'xpack.ml.nlp.modelDeployment.vCPURange.medium.max (number)',
        'xpack.ml.nlp.modelDeployment.vCPURange.medium.min (number)',
        'xpack.ml.nlp.modelDeployment.vCPURange.medium.static (number?)',
        'xpack.osquery.actionEnabled (boolean?)',
        'xpack.remote_clusters.ui.enabled (boolean?)',
        'xpack.ingest_pipelines.enableManageProcessors (boolean?|never)',
        /**
         * NOTE: The Reporting plugin is currently disabled in functional tests (see test/functional/config.base.js).
         * It will be re-enabled once #102552 is completed.
         */
        // 'xpack.reporting.poll.jobCompletionNotifier.interval (number)',
        // 'xpack.reporting.poll.jobCompletionNotifier.intervalErrorMultiplier (number)',
        // 'xpack.reporting.poll.jobsRefresh.interval (number)',
        // 'xpack.reporting.poll.jobsRefresh.intervalErrorMultiplier (number)',
        'xpack.rollup.ui.enabled (boolean?)',
        'xpack.saved_object_tagging.cache_refresh_interval (duration?)',

        'xpack.searchAssistant.ui.enabled (boolean?)',
        'xpack.searchInferenceEndpoints.ui.enabled (boolean?)',
        'xpack.searchPlayground.ui.enabled (boolean?)',
        'xpack.security.loginAssistanceMessage (string?)',
        'xpack.security.sameSiteCookies (Strict?|Lax?|None?)',
        'xpack.security.showInsecureClusterWarning (boolean?)',
        'xpack.security.showNavLinks (boolean?)',
        'xpack.security.ui (object?|never)',
        'xpack.security.roleManagementEnabled (boolean?|never)',
        'xpack.spaces.maxSpaces (number?)',
        'xpack.spaces.allowFeatureVisibility (false|boolean?)',
        'xpack.spaces.allowSolutionVisibility (false|boolean?)',
        'xpack.securitySolution.enableExperimental (array?)',
        'xpack.securitySolution.prebuiltRulesPackageVersion (string?)',
        'xpack.securitySolution.offeringSettings (record?)',
        'xpack.snapshot_restore.slm_ui.enabled (boolean?)',
        'xpack.snapshot_restore.ui.enabled (boolean?)',
        'xpack.stack_connectors.enableExperimental (array?)',
        'xpack.trigger_actions_ui.enableExperimental (array?)',
        'xpack.trigger_actions_ui.enableGeoTrackingThresholdAlert (boolean?)',
        'xpack.timelines.enableExperimental (array?)',
        'xpack.alerting.rules.run.alerts.max (number?)',
        'xpack.upgrade_assistant.featureSet.migrateSystemIndices (boolean?)',
        'xpack.upgrade_assistant.featureSet.mlSnapshots (boolean?)',
        'xpack.upgrade_assistant.featureSet.reindexCorrectiveActions (boolean?)',
        'xpack.upgrade_assistant.featureSet.migrateDataStreams (boolean?)',
        'xpack.upgrade_assistant.ui.enabled (boolean?)',
        'xpack.observability.unsafe.alertDetails.metrics.enabled (boolean?)',
        'xpack.observability.unsafe.alertDetails.logs.enabled (boolean?)',
        'xpack.observability.unsafe.alertDetails.uptime.enabled (boolean?)',
        'xpack.observability.unsafe.alertDetails.observability.enabled (boolean?)',
        'xpack.observability.unsafe.thresholdRule.enabled (boolean?)',
        'xpack.observability_onboarding.ui.enabled (boolean?)',
        'xpack.observabilityLogsExplorer.navigation.showAppLink (boolean?|never)',
        'xpack.observabilityAIAssistant.scope (observability?|search?)',
        'xpack.observabilityAiAssistantManagement.logSourcesEnabled (boolean?)',
        'xpack.observabilityAiAssistantManagement.spacesEnabled (boolean?)',
        'xpack.observabilityAiAssistantManagement.visibilityEnabled (boolean?)',
        'share.new_version.enabled (boolean?)',
        'aiAssistantManagementSelection.preferredAIAssistantType (default?|never?|observability?)',
        /**
         * Rule form V2 feature flags
         */
        'discover.experimental.ruleFormV2Enabled (boolean?)',
        'xpack.infra.featureFlags.ruleFormV2Enabled (boolean?)',
        'xpack.legacy_uptime.experimental.ruleFormV2Enabled (boolean?)',
        'xpack.ml.experimental.ruleFormV2.enabled (boolean)',
        'xpack.transform.experimental.ruleFormV2Enabled (boolean?)',
        'xpack.apm.featureFlags.ruleFormV2Enabled (boolean?)',
        'xpack.observability.unsafe.ruleFormV2.enabled (boolean?)',
        'xpack.slo.experimental.ruleFormV2.enabled (boolean?)',
        /**/
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
        'xpack.security.loginAssistanceMessage (string?)',
        'xpack.security.sameSiteCookies (Strict?|Lax?|None?)',
        'xpack.security.showInsecureClusterWarning (boolean?)',
        'xpack.security.showNavLinks (boolean?)',
        'xpack.security.ui (object?|never)',
        'xpack.security.roleManagementEnabled (boolean?|never)',

        'telemetry.allowChangingOptInStatus (boolean?)',
        'telemetry.appendServerlessChannelsSuffix (true?|false?)',
        'telemetry.banner (boolean?)',
        'telemetry.labels.branch (string?)',
        'telemetry.labels.ciBuildId (string?)',
        'telemetry.labels.ciBuildJobId (string?)',
        'telemetry.labels.ciBuildNumber (number?)',
        'telemetry.labels.environment (string?)',
        'telemetry.labels.ftrConfig (string?)',
        'telemetry.labels.gitRev (string?)',
        'telemetry.labels.isPr (boolean?)',
        'telemetry.labels.journeyName (string?)',
        'telemetry.labels.prId (number?)',
        'telemetry.labels.testBuildId (string?)',
        'telemetry.labels.testJobId (string?)',
        'telemetry.labels.ciBuildName (string?)',
        'telemetry.labels.performancePhase (string?)',
        'telemetry.labels.serverless (string?|never)', // Can only be set on Serverless.
        'telemetry.hidePrivacyStatement (boolean?)',
        'telemetry.optIn (boolean?)',
        'telemetry.sendUsageFrom (server?|browser?)',
        'telemetry.sendUsageTo (prod?|staging?)',
        'usageCollection.uiCounters.debug (boolean?)',
        'usageCollection.uiCounters.enabled (boolean?)',
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
