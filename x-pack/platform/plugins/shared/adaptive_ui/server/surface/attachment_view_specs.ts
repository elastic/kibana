/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
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
 * Attachment types this module can render without a browser.
 *
 * Kept at parity with `adapterGallery` by `attachment_view_specs.test.ts`, since the two
 * lists are separate shapes — the gallery pairs a type with a rendered sample spec, this
 * one pairs it with the adapter function — and a type added to only one silently degrades
 * on every headless surface.
 */
export const viewSpecAdapterTypes: readonly string[] = Object.keys(attachmentViewSpecAdapters);

/**
 * Resolves an attachment's stored data to a `ViewSpec`, or `undefined` when the type has
 * no adapter — callers degrade rather than fail.
 */
export const toViewSpec = ({
  type,
  data,
  logger,
}: {
  type: string;
  data: unknown;
  logger?: Logger;
}): ViewSpec | undefined => {
  if (type === ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE) {
    const parsed = parseViewSpec(data);

    if (!parsed.valid || !parsed.spec) {
      logger?.debug(`Attachment of type "${type}" did not parse as a ViewSpec, degrading`);

      return undefined;
    }

    return parsed.spec;
  }

  const adapter = attachmentViewSpecAdapters[type];

  if (!adapter) {
    logger?.debug(`No ViewSpec adapter registered for attachment type "${type}", degrading`);

    return undefined;
  }

  try {
    return adapter(data as never);
  } catch (error) {
    // Adapters assume well-formed data; a stored attachment that predates a shape change
    // should degrade to the text fallback, not abort the surrounding projection.
    logger?.debug(`ViewSpec adapter for "${type}" threw, degrading: ${error.message}`);

    return undefined;
  }
};
