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

const managementSectionIds = {
  overview: i18n.translate('xpack.ml.management.overviewTitle', {
    defaultMessage: 'Overview',
  }),
  anomaly_detection: i18n.translate('xpack.ml.management.anomalyDetectionJobsTitle', {
    defaultMessage: 'Anomaly Detection Jobs',
  }),
  analytics: i18n.translate('xpack.ml.management.dataFrameAnalyticsJobsTitle', {
    defaultMessage: 'Data Frame Analytics Jobs',
  }),
  trained_models: i18n.translate('xpack.ml.management.trainedModelsTitle', {
    defaultMessage: 'Trained Models',
  }),
  supplied_configurations: i18n.translate('xpack.ml.management.suppliedConfigurationsTitle', {
    defaultMessage: 'Supplied Configurations',
  }),
  settings: i18n.translate('xpack.ml.management.settingsTitle', {
    defaultMessage: 'Settings',
  }),
};

export function registerManagementSections(
  management: ManagementSetup,
  core: CoreSetup<MlStartDependencies>,
  deps: { usageCollection?: UsageCollectionSetup }, // TODO: update type
  isServerless: boolean,
  mlFeatures: MlFeatures,
  nlpSettings: NLPSettings,
  experimentalFeatures: ExperimentalFeatures
) {
  Object.keys(managementSectionIds).forEach((sectionId) => {
    const sectionTitle = managementSectionIds[sectionId];
    management.sections.section.machineLearning
      .registerApp({
        id: sectionId,
        title: sectionTitle,
        order: 1,
        async mount(params: ManagementAppMountParams) {
          const [coreStart, pluginsStart] = await core.getStartServices();
          const {
            chrome: { docTitle },
          } = coreStart;

          docTitle.change(sectionTitle);

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

          const { mountApp } = await import('./mount_management_app');
          const unmountAppCallback = await mountApp(
            core,
            params,
            mlDeps,
            isServerless,
            mlFeatures,
            experimentalFeatures,
            nlpSettings,
            sectionId
          );

          return () => {
            docTitle.reset();
            unmountAppCallback();
          };
        },
      })
      .enable();
  });
}
