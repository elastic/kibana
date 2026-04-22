/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedbackRegistryEntry } from '@kbn/feedback-components';

const Q1_PLACEHOLDER = 'Share your use case';
const Q2_PLACEHOLDER = 'Share what would help';
const Q2_LABEL = "What's one thing that would make this more useful for you?";

export const anomalyExplorerQuestions: FeedbackRegistryEntry[] = [
  {
    id: 'ml_ad_anomaly_explorer_use_case',
    order: 1,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.ml.anomalyExplorer.q1Placeholder',
      defaultMessage: Q1_PLACEHOLDER,
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.ml.anomalyExplorer.q1Label',
      defaultMessage: 'What were you trying to detect or investigate just now?',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.ml.anomalyExplorer.q1AriaLabel',
      defaultMessage: 'What were you trying to detect or investigate just now?',
    },
    question: 'What were you trying to detect or investigate just now?',
  },
  {
    id: 'ml_ad_anomaly_explorer_improvements',
    order: 2,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.ml.anomalyExplorer.q2Placeholder',
      defaultMessage: Q2_PLACEHOLDER,
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.ml.anomalyExplorer.q2Label',
      defaultMessage: Q2_LABEL,
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.ml.anomalyExplorer.q2AriaLabel',
      defaultMessage: Q2_LABEL,
    },
    question: Q2_LABEL,
  },
];

export const resultExplorerQuestions: FeedbackRegistryEntry[] = [
  {
    id: 'ml_dfa_result_explorer_use_case',
    order: 1,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.ml.resultExplorer.q1Placeholder',
      defaultMessage: Q1_PLACEHOLDER,
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.ml.resultExplorer.q1Label',
      defaultMessage: 'What were you trying to discover or analyze just now?',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.ml.resultExplorer.q1AriaLabel',
      defaultMessage: 'What were you trying to discover or analyze just now?',
    },
    question: 'What were you trying to discover or analyze just now?',
  },
  {
    id: 'ml_dfa_result_explorer_improvements',
    order: 2,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.ml.resultExplorer.q2Placeholder',
      defaultMessage: Q2_PLACEHOLDER,
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.ml.resultExplorer.q2Label',
      defaultMessage: Q2_LABEL,
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.ml.resultExplorer.q2AriaLabel',
      defaultMessage: Q2_LABEL,
    },
    question: Q2_LABEL,
  },
];

export const analyticsMapQuestions: FeedbackRegistryEntry[] = [
  {
    id: 'ml_analytics_map_use_case',
    order: 1,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.ml.analyticsMap.q1Placeholder',
      defaultMessage: Q1_PLACEHOLDER,
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.ml.analyticsMap.q1Label',
      defaultMessage: 'What were you trying to explore or understand just now?',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.ml.analyticsMap.q1AriaLabel',
      defaultMessage: 'What were you trying to explore or understand just now?',
    },
    question: 'What were you trying to explore or understand just now?',
  },
  {
    id: 'ml_analytics_map_improvements',
    order: 2,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.ml.analyticsMap.q2Placeholder',
      defaultMessage: Q2_PLACEHOLDER,
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.ml.analyticsMap.q2Label',
      defaultMessage: Q2_LABEL,
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.ml.analyticsMap.q2AriaLabel',
      defaultMessage: Q2_LABEL,
    },
    question: Q2_LABEL,
  },
];

export const singleMetricViewerQuestions: FeedbackRegistryEntry[] = [
  {
    id: 'ml_smv_use_case',
    order: 1,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.ml.singleMetricViewer.q1Placeholder',
      defaultMessage: Q1_PLACEHOLDER,
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.ml.singleMetricViewer.q1Label',
      defaultMessage: 'What were you trying to detect or investigate just now?',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.ml.singleMetricViewer.q1AriaLabel',
      defaultMessage: 'What were you trying to detect or investigate just now?',
    },
    question: 'What were you trying to detect or investigate just now?',
  },
  {
    id: 'ml_smv_improvements',
    order: 2,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.ml.singleMetricViewer.q2Placeholder',
      defaultMessage: Q2_PLACEHOLDER,
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.ml.singleMetricViewer.q2Label',
      defaultMessage: Q2_LABEL,
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.ml.singleMetricViewer.q2AriaLabel',
      defaultMessage: Q2_LABEL,
    },
    question: Q2_LABEL,
  },
];
