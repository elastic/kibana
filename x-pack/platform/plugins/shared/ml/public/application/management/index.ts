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

export enum MANAGEMENT_SECTION_IDS {
  OVERVIEW = 'overview',
  ANOMALY_DETECTION = 'anomaly_detection',
  ANALYTICS = 'analytics',
  TRAINED_MODELS = 'trained_models',
  SUPPLIED_CONFIGURATIONS = 'supplied_configurations',
  AD_SETTINGS = 'ad_settings',
}
type ManagementSectionId = `${MANAGEMENT_SECTION_IDS}`;

export const MANAGEMENT_SECTIONS = {
  [MANAGEMENT_SECTION_IDS.OVERVIEW]: i18n.translate('xpack.ml.management.overviewTitle', {
    defaultMessage: 'Overview',
  }),
  [MANAGEMENT_SECTION_IDS.ANOMALY_DETECTION]: i18n.translate(
    'xpack.ml.management.anomalyDetectionJobsTitle',
    {
      defaultMessage: 'Anomaly Detection Jobs',
    }
  ),
  [MANAGEMENT_SECTION_IDS.ANALYTICS]: i18n.translate(
    'xpack.ml.management.dataFrameAnalyticsJobsTitle',
    {
      defaultMessage: 'Data Frame Analytics Jobs',
    }
  ),
  [MANAGEMENT_SECTION_IDS.TRAINED_MODELS]: i18n.translate(
    'xpack.ml.management.trainedModelsTitle',
    {
      defaultMessage: 'Trained Models',
    }
  ),
  [MANAGEMENT_SECTION_IDS.AD_SETTINGS]: i18n.translate('xpack.ml.management.settingsTitle', {
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
  Object.keys(MANAGEMENT_SECTIONS).forEach((sectionId) => {
    const sectionTitle = MANAGEMENT_SECTIONS[sectionId as ManagementSectionId];
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
            fieldFormats: pluginsStart.fieldFormats,
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
            spaces: pluginsStart.spaces,
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
