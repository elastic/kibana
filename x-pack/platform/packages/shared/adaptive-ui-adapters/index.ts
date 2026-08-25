/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ViewSpec } from '@kbn/adaptive-ui';
import { sampleTextAttachment, toTextViewSpec } from './src/text';
import { sampleEsqlAttachment, toEsqlViewSpec } from './src/esql';
import { sampleCase, toCaseViewSpec } from './src/case';
import { sampleCases, toCasesViewSpec } from './src/cases';
import { sampleSecurityRuleAttachment, toSecurityRuleViewSpec } from './src/security_rule';
import { sampleAlertingRule, toAlertingRuleViewSpec } from './src/alerting_rule';
import { sampleActionPolicy, toActionPolicyViewSpec } from './src/action_policy';
import { sampleWorkflowYaml, toWorkflowYamlViewSpec } from './src/workflow_yaml';
import { sampleWorkflowYamlDiff, toWorkflowYamlDiffViewSpec } from './src/workflow_yaml_diff';
import { sampleSigEvent, toSigEventViewSpec } from './src/sig_event';
import { sampleInvestigation, toInvestigationViewSpec } from './src/investigation';
import { sampleSigEventDetection, toSigEventDetectionViewSpec } from './src/sig_event_detection';
import { sampleKiFeature, toKiFeatureViewSpec } from './src/ki_feature';
import { sampleSkill, toSkillViewSpec } from './src/skill';
import { sampleConnectorSetup, toConnectorSetupViewSpec } from './src/connector_setup';
import {
  sampleEntityAnalyticsDashboard,
  toEntityAnalyticsDashboardViewSpec,
} from './src/entity_analytics_dashboard';
import {
  sampleEntityRiskScoreHistory,
  toEntityRiskScoreHistoryViewSpec,
} from './src/entity_risk_score_history';
import { sampleGraph, toGraphViewSpec } from './src/graph';
import { sampleServiceMap, toServiceMapViewSpec } from './src/service_map';

export { toTextViewSpec, sampleTextAttachment } from './src/text';
export { toEsqlViewSpec, sampleEsqlAttachment } from './src/esql';
export { toCaseViewSpec, sampleCase, type CaseData } from './src/case';
export { toCasesViewSpec, sampleCases, type CasesData } from './src/cases';
export {
  toSecurityRuleViewSpec,
  buildSecurityRuleViewSpec,
  sampleSecurityRule,
  sampleSecurityRuleAttachment,
  type SecurityRule,
  type SecurityRuleData,
} from './src/security_rule';
export {
  toAlertingRuleViewSpec,
  sampleAlertingRule,
  type AlertingRuleData,
} from './src/alerting_rule';
export {
  toActionPolicyViewSpec,
  sampleActionPolicy,
  type ActionPolicyData,
} from './src/action_policy';
export {
  toWorkflowYamlViewSpec,
  sampleWorkflowYaml,
  type WorkflowYamlData,
} from './src/workflow_yaml';
export {
  toWorkflowYamlDiffViewSpec,
  sampleWorkflowYamlDiff,
  type WorkflowYamlDiffData,
} from './src/workflow_yaml_diff';
export {
  toSigEventViewSpec,
  buildSignificantEventSpec,
  sampleSigEvent,
  significantEventFixture,
  significantEventSpec,
  type SignificantEventInput,
} from './src/sig_event';
export {
  toSignificantEventAttachmentViewSpec,
  type SignificantEventAttachmentInput,
} from './src/sig_event_attachment';
export {
  toInvestigationViewSpec,
  sampleInvestigation,
  investigationSpec,
  type InvestigationInput,
} from './src/investigation';
export {
  toSigEventDetectionViewSpec,
  sampleSigEventDetection,
  type SigEventDetectionData,
} from './src/sig_event_detection';
export { toKiFeatureViewSpec, sampleKiFeature, type KiFeatureData } from './src/ki_feature';
export { toSkillViewSpec, sampleSkill, type SkillData } from './src/skill';
export {
  toConnectorSetupViewSpec,
  sampleConnectorSetup,
  type ConnectorSetupData,
} from './src/connector_setup';
export {
  toEntityAnalyticsDashboardViewSpec,
  sampleEntityAnalyticsDashboard,
  type EntityAnalyticsDashboardData,
} from './src/entity_analytics_dashboard';
export {
  toEntityRiskScoreHistoryViewSpec,
  sampleEntityRiskScoreHistory,
  type EntityRiskScoreHistoryData,
} from './src/entity_risk_score_history';
export { toGraphViewSpec, sampleGraph, type GraphData } from './src/graph';
export { toServiceMapViewSpec, sampleServiceMap, type ServiceMapData } from './src/service_map';

export interface AdapterGalleryEntry {
  /** Agent Builder attachment type id this adapter renders. */
  attachmentType: string;
  /** `true` when the render is a degraded fallback pending a primitive (see primitive gaps doc). */
  degraded?: boolean;
  spec: ViewSpec;
}

/**
 * Every attachment adapter applied to its sample fixture, for the cross-surface
 * demo and as the canonical list `getViewSpec` adopters draw from.
 */
export const adapterGallery: AdapterGalleryEntry[] = [
  { attachmentType: 'text', spec: toTextViewSpec(sampleTextAttachment) },
  { attachmentType: 'esql', spec: toEsqlViewSpec(sampleEsqlAttachment) },
  { attachmentType: 'case', spec: toCaseViewSpec(sampleCase) },
  { attachmentType: 'cases', spec: toCasesViewSpec(sampleCases) },
  { attachmentType: 'security.rule', spec: toSecurityRuleViewSpec(sampleSecurityRuleAttachment) },
  { attachmentType: 'platform.alerting.rule', spec: toAlertingRuleViewSpec(sampleAlertingRule) },
  {
    attachmentType: 'platform.alerting.action_policy',
    spec: toActionPolicyViewSpec(sampleActionPolicy),
  },
  { attachmentType: 'workflow.yaml', spec: toWorkflowYamlViewSpec(sampleWorkflowYaml) },
  {
    attachmentType: 'workflow.yaml.diff',
    spec: toWorkflowYamlDiffViewSpec(sampleWorkflowYamlDiff),
  },
  { attachmentType: 'platform.sig_event', spec: toSigEventViewSpec(sampleSigEvent) },
  {
    attachmentType: 'nightshift.investigation',
    spec: toInvestigationViewSpec(sampleInvestigation),
  },
  {
    attachmentType: 'platform.sig_event_detection',
    spec: toSigEventDetectionViewSpec(sampleSigEventDetection),
  },
  { attachmentType: 'platform.ki_feature', spec: toKiFeatureViewSpec(sampleKiFeature) },
  { attachmentType: 'skill', spec: toSkillViewSpec(sampleSkill) },
  { attachmentType: 'connector_setup', spec: toConnectorSetupViewSpec(sampleConnectorSetup) },
  {
    attachmentType: 'security.entity_analytics_dashboard',
    spec: toEntityAnalyticsDashboardViewSpec(sampleEntityAnalyticsDashboard),
  },
  {
    attachmentType: 'security.entity_risk_score_history',
    spec: toEntityRiskScoreHistoryViewSpec(sampleEntityRiskScoreHistory),
  },
  { attachmentType: 'graph', spec: toGraphViewSpec(sampleGraph) },
  { attachmentType: 'observability.service-map', spec: toServiceMapViewSpec(sampleServiceMap) },
];
