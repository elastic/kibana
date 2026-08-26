/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { FakeIntegration } from './fake_integrations';
import { getTotalTemplateCount } from './integration_shared';

/**
 * Session tag for every Agent Builder chat opened from the super-short-term
 * integrations hub. Keeps these conversations grouped and distinct from the
 * entity-centric flyout / Discover chat sessions.
 */
export const INTEGRATIONS_SESSION_TAG = 'entity-centric-lab-integrations';

/**
 * Build the ambient, hidden `screen_context` attachment describing the
 * integration the user is currently viewing. This is sent via
 * `agentBuilder.setChatConfig` so *any* chat opened while the integration
 * detail page is on-screen sees the page as background context — the user
 * never sees a pill for it.
 *
 * Important: this deliberately uses the built-in {@link AttachmentType.screenContext}
 * type with a fully string-valued `additional_data` map. Agent Builder's
 * `setChatConfig` only accepts the built-in screen-context payload ambiently
 * (custom/visible attachment types are rejected with a 400), and the schema
 * requires every `additional_data` value to be a string — so everything is
 * stringified here. Mirrors the proven entity-centric flyout implementation.
 */
export const buildIntegrationScreenContextAttachment = (
  integration: FakeIntegration,
  usedTemplateCount: number
): AttachmentInput => {
  const totalTemplateCount = getTotalTemplateCount(integration);

  return {
    hidden: true,
    type: AttachmentType.screenContext,
    data: {
      app: INTEGRATIONS_SESSION_TAG,
      url: window.location.href,
      description: i18n.translate(
        'xpack.streams.entityCentricLab.integrations.chatScreenContextDescription',
        {
          defaultMessage:
            'The user is viewing the "{name}" integration (v{version}) in the Infrastructure integrations hub.',
          values: { name: integration.name, version: integration.version },
        }
      ),
      additional_data: {
        integration_id: integration.id,
        integration_name: integration.name,
        integration_version: integration.version,
        update_available: String(integration.updateAvailable),
        update_version: integration.updateVersion ?? '',
        dashboards_count: String(integration.dashboards.length),
        data_streams_count: String(integration.dataStreams.length),
        alert_rules_enabled_count: String(integration.alertRules.enabled.length),
        alert_rules_recommended_count: String(integration.alertRules.recommended.length),
        slo_templates_enabled_count: String(integration.sloTemplates.enabled.length),
        slo_templates_recommended_count: String(integration.sloTemplates.recommended.length),
        templates_used_count: String(usedTemplateCount),
        templates_total_count: String(totalTemplateCount),
        anomaly_detection_jobs_count: String(
          integration.mlAssets.filter((asset) => asset.type === 'Anomaly detection job').length
        ),
        ai_skills_count: String(
          integration.mlAssets.filter((asset) => asset.type === 'AI skill').length
        ),
        dashboards: JSON.stringify(integration.dashboards.map((dashboard) => dashboard.name)),
        data_streams: JSON.stringify(
          integration.dataStreams.map((dataStream) => ({
            name: dataStream.name,
            quality: dataStream.quality,
          }))
        ),
        active_alerts_count: String(integration.stats.alertsInAlert),
        breaching_slos_count: String(integration.stats.breachingSlos),
      },
    },
  };
};
