/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CasesPublicSetup } from '@kbn/cases-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { CASES_ATTACHMENT_CHANGE_POINT_CHART } from '@kbn/aiops-change-point-detection/constants';
import { CASES_ATTACHMENT_LOG_PATTERN } from '@kbn/aiops-log-pattern-analysis/constants';
import { CASES_ATTACHMENT_LOG_RATE_ANALYSIS } from '@kbn/aiops-log-rate-analysis/constants';
import {
  getChangePointDetectionComponent,
  getLogRateAnalysisEmbeddableWrapperComponent,
  getPatternAnalysisComponent,
} from '../shared_components';
import type { AiopsPluginStartDeps } from '../types';

export function registerCases(
  cases: CasesPublicSetup,
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
) {
  const ChangePointDetectionComponent = getChangePointDetectionComponent(coreStart, pluginStart);

  cases.attachmentFramework.registerPersistableState({
    id: CASES_ATTACHMENT_CHANGE_POINT_CHART,
    icon: 'machineLearningApp',
    displayName: i18n.translate('xpack.aiops.changePointDetection.cases.attachmentName', {
      defaultMessage: 'Change point chart',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.aiops.changePointDetection.cases.attachmentEvent"
          defaultMessage="added change point chart"
        />
      ),
      timelineAvatar: 'machineLearningApp',
      children: React.lazy(async () => {
        const { initComponent } = await import('./change_point_charts_attachment');

        return {
          default: initComponent(pluginStart.fieldFormats, ChangePointDetectionComponent),
        };
      }),
    }),
    getAttachmentRemovalObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.aiops.changePointDetection.cases.attachmentRemovalEvent"
          defaultMessage="removed change point chart"
        />
      ),
    }),
  });

  const LogPatternAttachmentComponent = getPatternAnalysisComponent(coreStart, pluginStart);

  cases.attachmentFramework.registerPersistableState({
    id: CASES_ATTACHMENT_LOG_PATTERN,
    icon: 'machineLearningApp',
    displayName: i18n.translate('xpack.aiops.logPatternAnalysis.cases.attachmentName', {
      defaultMessage: 'Log pattern analysis',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.aiops.logPatternAnalysis.cases.attachmentEvent"
          defaultMessage="added log pattern analysis"
        />
      ),
      timelineAvatar: 'machineLearningApp',
      children: React.lazy(async () => {
        const { initComponent } = await import('./log_pattern_attachment');

        return { default: initComponent(pluginStart.fieldFormats, LogPatternAttachmentComponent) };
      }),
    }),
    getAttachmentRemovalObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.aiops.logPatternAnalysis.cases.attachmentRemovalEvent"
          defaultMessage="removed log pattern analysis"
        />
      ),
    }),
  });

  const LogRateAnalysisEmbeddableWrapperComponent = getLogRateAnalysisEmbeddableWrapperComponent(
    coreStart,
    pluginStart
  );

  cases.attachmentFramework.registerPersistableState({
    id: CASES_ATTACHMENT_LOG_RATE_ANALYSIS,
    icon: 'machineLearningApp',
    displayName: i18n.translate('xpack.aiops.logRateAnalysis.cases.attachmentName', {
      defaultMessage: 'Log rate analysis',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.aiops.logRateAnalysis.cases.attachmentEvent"
          defaultMessage="added log rate analysis"
        />
      ),
      timelineAvatar: 'machineLearningApp',
      children: React.lazy(async () => {
        const { initComponent } = await import('./log_rate_analysis_attachment');

        return {
          default: initComponent(
            pluginStart.fieldFormats,
            LogRateAnalysisEmbeddableWrapperComponent
          ),
        };
      }),
    }),
    getAttachmentRemovalObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.aiops.logRateAnalysis.cases.attachmentRemovalEvent"
          defaultMessage="removed log rate analysis"
        />
      ),
    }),
  });
}
