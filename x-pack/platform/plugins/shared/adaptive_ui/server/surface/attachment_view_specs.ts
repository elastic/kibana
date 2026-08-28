/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseViewSpec, type ViewSpec } from '@kbn/adaptive-ui';
import {
  toTextViewSpec,
  toEsqlViewSpec,
  toCaseViewSpec,
  toCasesViewSpec,
  toSecurityRuleViewSpec,
  toAlertingRuleViewSpec,
  toActionPolicyViewSpec,
  toWorkflowYamlViewSpec,
  toWorkflowYamlDiffViewSpec,
  toSigEventViewSpec,
  toInvestigationViewSpec,
  toSigEventDetectionViewSpec,
  toKiFeatureViewSpec,
  toSkillViewSpec,
  toConnectorSetupViewSpec,
  toEntityAnalyticsDashboardViewSpec,
  toEntityRiskScoreHistoryViewSpec,
  toGraphViewSpec,
  toServiceMapViewSpec,
} from '@kbn/adaptive-ui-adapters';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';

/**
 * Server-side `attachmentType → ViewSpec` map, keyed the same way `adapterGallery` is.
 *
 * The browser reaches these adapters through each attachment type's `getViewSpec`; a
 * headless surface has no such hook, so the same functions are indexed here rather than
 * remapped — one definition, two callers.
 */
const attachmentViewSpecAdapters: Record<string, (data: never) => ViewSpec> = {
  text: toTextViewSpec,
  esql: toEsqlViewSpec,
  case: toCaseViewSpec,
  cases: toCasesViewSpec,
  'security.rule': toSecurityRuleViewSpec,
  'platform.alerting.rule': toAlertingRuleViewSpec,
  'platform.alerting.action_policy': toActionPolicyViewSpec,
  'workflow.yaml': toWorkflowYamlViewSpec,
  'workflow.yaml.diff': toWorkflowYamlDiffViewSpec,
  'platform.sig_event': toSigEventViewSpec,
  'nightshift.investigation': toInvestigationViewSpec,
  'platform.sig_event_detection': toSigEventDetectionViewSpec,
  'platform.ki_feature': toKiFeatureViewSpec,
  skill: toSkillViewSpec,
  connector_setup: toConnectorSetupViewSpec,
  'security.entity_analytics_dashboard': toEntityAnalyticsDashboardViewSpec,
  'security.entity_risk_score_history': toEntityRiskScoreHistoryViewSpec,
  graph: toGraphViewSpec,
  'observability.service-map': toServiceMapViewSpec,
};

/**
 * Resolves an attachment's stored data to a `ViewSpec`, or `undefined` when the type has
 * no adapter — callers degrade rather than fail.
 */
export const toViewSpec = ({
  type,
  data,
}: {
  type: string;
  data: unknown;
}): ViewSpec | undefined => {
  if (type === ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE) {
    const parsed = parseViewSpec(data);

    return parsed.valid && parsed.spec ? parsed.spec : undefined;
  }

  const adapter = attachmentViewSpecAdapters[type];

  if (!adapter) {
    return undefined;
  }

  try {
    return adapter(data as never);
  } catch {
    // Adapters assume well-formed data; a stored attachment that predates a shape change
    // should degrade to the text fallback, not abort the surrounding projection.
    return undefined;
  }
};
