/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { CoreSetup } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { MlFeatures, NLPSettings, ExperimentalFeatures } from '../../../common/constants/app';
import type { MlStartDependencies } from '../../plugin';

export function registerManagementSections(
  management: ManagementSetup,
  core: CoreSetup<MlStartDependencies>,
  deps: { usageCollection?: UsageCollectionSetup }, // this is all the deps for app.tsx in ml - will need to update type
  isServerless: boolean,
  mlFeatures: MlFeatures,
  nlpSettings: NLPSettings,
  experimentalFeatures: ExperimentalFeatures
) {
  const overviewTitle = i18n.translate('xpack.ml.management.overviewTitle', {
    defaultMessage: 'Overview',
  });
  const adJobsTitle = i18n.translate('xpack.ml.management.anomalyDetectionJobsTitle', {
    defaultMessage: 'Anomaly Detection Jobs',
  });
  const dfaJobsTitle = i18n.translate('xpack.ml.management.dataFrameAnalyticsJobsTitle', {
    defaultMessage: 'Data Frame Analytics Jobs',
  });
  const trainedModelsTitle = i18n.translate('xpack.ml.management.trainedModelsTitle', {
    defaultMessage: 'Trained Models',
  });
  const suppliedConfigurationsTitle = i18n.translate(
    'xpack.ml.management.suppliedConfigurationsTitle',
    {
      defaultMessage: 'Supplied Configurations',
    }
  );
  const settingsTitle = i18n.translate('xpack.ml.management.settingsTitle', {
    defaultMessage: 'Settings',
  });

  management.sections.section.machineLearning
    .registerApp({
      id: 'jobsListLink', // TODO: will need to update this
      title: overviewTitle,
      order: 1,
      async mount(params: ManagementAppMountParams) {
        const [{ chrome }] = await core.getStartServices();
        const { docTitle } = chrome;

        docTitle.change(overviewTitle);

        const { mountApp } = await import('./overview');
        const unmountAppCallback = await mountApp(core, params, deps, isServerless, mlFeatures);

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    })
    .enable();

  management.sections.section.machineLearning
    .registerApp({
      id: 'anomaly_detection',
      title: adJobsTitle,
      order: 2,
      async mount(params: ManagementAppMountParams) {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const {
          chrome: { docTitle },
        } = coreStart;

        docTitle.change(overviewTitle);

        const mlDeps = {
          cases: pluginsStart.cases,
          charts: pluginsStart.charts,
          contentManagement: pluginsStart.contentManagement,
          dashboard: pluginsStart.dashboard,
          data: pluginsStart.data,
          dataViewEditor: pluginsStart.dataViewEditor,
          dataVisualizer: pluginsStart.dataVisualizer,
          // embeddable: { ...pluginsSetup.embeddable, ...pluginsStart.embeddable },
          fieldFormats: pluginsStart.fieldFormats,
          // kibanaVersion: this.initializerContext.env.packageInfo.version,
          lens: pluginsStart.lens,
          licensing: pluginsStart.licensing,
          maps: pluginsStart.maps,
          observabilityAIAssistant: pluginsStart.observabilityAIAssistant,
          presentationUtil: pluginsStart.presentationUtil,
          savedObjectsManagement: pluginsStart.savedObjectsManagement,
          savedSearch: pluginsStart.savedSearch,
          security: pluginsStart.security,
          share: pluginsStart.share,
          triggersActionsUi: pluginsStart.triggersActionsUi,
          uiActions: pluginsStart.uiActions,
          unifiedSearch: pluginsStart.unifiedSearch,
          ...deps,
        };

        const { mountApp } = await import('./anomaly_detection_jobs');
        const unmountAppCallback = await mountApp(
          core,
          params,
          mlDeps,
          isServerless,
          mlFeatures,
          experimentalFeatures,
          nlpSettings
        );

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    })
    .enable();

  management.sections.section.machineLearning
    .registerApp({
      id: 'data_frame_analytics',
      title: dfaJobsTitle,
      order: 3,
      async mount(params: ManagementAppMountParams) {
        const [{ chrome }] = await core.getStartServices();
        const { docTitle } = chrome;

        docTitle.change(overviewTitle);

        const { mountApp } = await import('./data_frame_analytics_jobs');
        const unmountAppCallback = await mountApp(core, params, deps, isServerless, mlFeatures);

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    })
    .enable();

  management.sections.section.machineLearning
    .registerApp({
      id: 'trained_models',
      title: trainedModelsTitle,
      order: 4,
      async mount(params: ManagementAppMountParams) {
        const [{ chrome }] = await core.getStartServices();
        const { docTitle } = chrome;

        docTitle.change(overviewTitle);

        const { mountApp } = await import('./trained_models');
        const unmountAppCallback = await mountApp(
          core,
          params,
          deps,
          isServerless,
          mlFeatures,
          nlpSettings
        );

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    })
    .enable();

  management.sections.section.machineLearning
    .registerApp({
      id: 'supplied_configurations',
      title: suppliedConfigurationsTitle,
      order: 5,
      async mount(params: ManagementAppMountParams) {
        const [{ chrome }] = await core.getStartServices();
        const { docTitle } = chrome;

        docTitle.change(overviewTitle);

        const { mountApp } = await import('./supplied_configurations');
        const unmountAppCallback = await mountApp(
          core,
          params,
          deps,
          isServerless,
          mlFeatures,
          nlpSettings
        );

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    })
    .enable();

  management.sections.section.machineLearning
    .registerApp({
      id: 'settings',
      title: settingsTitle,
      order: 6,
      async mount(params: ManagementAppMountParams) {
        const [{ chrome }] = await core.getStartServices();
        const { docTitle } = chrome;

        docTitle.change(overviewTitle);

        const { mountApp } = await import('./settings');
        const unmountAppCallback = await mountApp(
          core,
          params,
          deps,
          isServerless,
          mlFeatures,
          nlpSettings
        );

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    })
    .enable();
}
