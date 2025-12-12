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
import type { MlCapabilities } from '../../../common/types/capabilities';
import type { MlFeatures, NLPSettings, ExperimentalFeatures } from '../../../common/constants/app';
import type { MlStartDependencies } from '../../plugin';
import type { ITelemetryClient } from '../services/telemetry/types';

export enum MANAGEMENT_SECTION_IDS {
  OVERVIEW = 'overview',
  ANOMALY_DETECTION = 'anomaly_detection',
  ANALYTICS = 'analytics',
  TRAINED_MODELS = 'trained_models',
  AD_SETTINGS = 'ad_settings',
}
export type ManagementSectionId = `${MANAGEMENT_SECTION_IDS}`;

const MANAGED_SECTIONS_SERVERLESS_CHECK: Record<
  ManagementSectionId,
  (mlFeatures: MlFeatures, isServerless: boolean, mlCapabilities: MlCapabilities) => boolean
> = {
  [MANAGEMENT_SECTION_IDS.OVERVIEW]: (
    mlFeatures: MlFeatures,
    isServerless: boolean,
    mlCapabilities: MlCapabilities
  ) => {
    const isEsProject = !mlFeatures.ad && !mlFeatures.dfa && mlFeatures.nlp;
    if (isEsProject) return true;

    return (
      // Can see Memory Usage & Notifications
      mlCapabilities.canViewMlNodes ||
      (mlFeatures.nlp && mlCapabilities.canGetTrainedModels) ||
      (mlFeatures.dfa && mlCapabilities.canGetDataFrameAnalytics) ||
      (mlFeatures.ad && mlCapabilities.canGetJobs)
    );
  },
  [MANAGEMENT_SECTION_IDS.ANOMALY_DETECTION]: (
    mlFeatures: MlFeatures,
    isServerless: boolean,
    mlCapabilities: MlCapabilities
  ) => {
    return mlFeatures.ad && mlCapabilities.isADEnabled && mlCapabilities.canGetJobs;
  },
  [MANAGEMENT_SECTION_IDS.ANALYTICS]: (
    mlFeatures: MlFeatures,
    isServerless: boolean,
    mlCapabilities: MlCapabilities
  ) => {
    const isEsProject = !mlFeatures.ad && !mlFeatures.dfa && mlFeatures.nlp;
    if (isEsProject) return false;

    return mlFeatures.dfa && mlCapabilities.isDFAEnabled && mlCapabilities.canGetDataFrameAnalytics;
  },
  [MANAGEMENT_SECTION_IDS.TRAINED_MODELS]: (
    mlFeatures: MlFeatures,
    isServerless: boolean,
    mlCapabilities: MlCapabilities
  ) => {
    const isEsProject = isServerless && !mlFeatures.ad && !mlFeatures.dfa && mlFeatures.nlp;
    if (isEsProject) return true;
    return (mlFeatures.nlp || mlFeatures.dfa) && mlCapabilities.canGetTrainedModels;
  },
  [MANAGEMENT_SECTION_IDS.AD_SETTINGS]: (
    mlFeatures: MlFeatures,
    isServerless: boolean,
    mlCapabilities: MlCapabilities
  ) => {
    return mlFeatures.ad && mlCapabilities.isADEnabled && mlCapabilities.canGetJobs;
  },
};

export const MANAGEMENT_SECTIONS: Record<ManagementSectionId, string> = {
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
    defaultMessage: 'Anomaly Detection Settings',
  }),
};

export function registerManagementSections(
  management: ManagementSetup,
  core: CoreSetup<MlStartDependencies>,
  deps: { usageCollection?: UsageCollectionSetup; telemetry?: ITelemetryClient },
  isServerless: boolean,
  mlFeatures: MlFeatures,
  nlpSettings: NLPSettings,
  experimentalFeatures: ExperimentalFeatures,
  mlCapabilities: MlCapabilities
) {
  Object.keys(MANAGEMENT_SECTIONS).forEach((id) => {
    const checkPermissionFn = MANAGED_SECTIONS_SERVERLESS_CHECK[id as ManagementSectionId];

    if (!checkPermissionFn) {
      throw new Error(`Unable to check permission for ML management section ${id}`);
    }
    const shouldShowSection = checkPermissionFn(mlFeatures, isServerless, mlCapabilities);
    if (!shouldShowSection) return;

    const sectionId = id as ManagementSectionId;
    const sectionTitle = MANAGEMENT_SECTIONS[sectionId];
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
        hideFromSidebar: sectionId === MANAGEMENT_SECTION_IDS.AD_SETTINGS,
      })
      .enable();
  });
}
