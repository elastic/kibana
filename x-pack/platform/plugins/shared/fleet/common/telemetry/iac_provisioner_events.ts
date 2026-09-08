/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@elastic/ebt/client';

/**
 * EBT events for IaC Provisioner template rendering. Defined in common/ so both
 * the server (render calls, brokered through the internal route) and the
 * browser (static-template fallback usage) can register and report them.
 *
 * `flow` distinguishes the consumer: 'cloud_connector' for the MVP;
 * 'iac_key_check' is used by the verify endpoint and 'iac_upgrade_task' by the
 * daily upgrade-check background task (both are key-only, render=false flows).
 */

export const CLOUD_CONNECTOR_RENDER_FLOW = 'cloud_connector' as const;
/** Key-only render (`render=false`) issued by the Existing FI check / verify endpoint. */
export const IAC_KEY_CHECK_FLOW = 'iac_key_check' as const;
/** Key-only render issued by the daily `fleet:iac_upgrade_check` task. */
export const IAC_UPGRADE_TASK_FLOW = 'iac_upgrade_task' as const;

export type IacProvisionerRenderFlow =
  | typeof CLOUD_CONNECTOR_RENDER_FLOW
  | typeof IAC_KEY_CHECK_FLOW
  | typeof IAC_UPGRADE_TASK_FLOW;

/**
 * `reason` values for IAC_PROVISIONER_RENDER_FALLBACK_EVENT — telemetry
 * vocabulary, queried by exact string; change only with a migration plan.
 */
export const IAC_PROVISIONER_FALLBACK_REASON_MISSING_CONTEXT = 'missing_render_context' as const;
export const IAC_PROVISIONER_FALLBACK_REASON_RENDER_FAILED = 'render_failed' as const;

export interface IacProvisionerRenderRequestedFields {
  flow: IacProvisionerRenderFlow;
  integrationCount: number;
}

export interface IacProvisionerRenderCompletedFields {
  flow: IacProvisionerRenderFlow;
  success: boolean;
  httpStatus: number;
  errorCodes: string[];
  latencyMs: number;
}

export interface IacProvisionerRenderFallbackFields {
  flow: IacProvisionerRenderFlow;
  reason: string;
}

export const IAC_PROVISIONER_RENDER_REQUESTED_EVENT: EventTypeOpts<IacProvisionerRenderRequestedFields> =
  {
    eventType: 'iac_provisioner_render_requested',
    schema: {
      flow: {
        type: 'keyword',
        _meta: { description: 'The Kibana flow that requested the render.' },
      },
      integrationCount: {
        type: 'integer',
        _meta: { description: 'Number of integrations included in the render request.' },
      },
    },
  };

export const IAC_PROVISIONER_RENDER_COMPLETED_EVENT: EventTypeOpts<IacProvisionerRenderCompletedFields> =
  {
    eventType: 'iac_provisioner_render_completed',
    schema: {
      flow: {
        type: 'keyword',
        _meta: { description: 'The Kibana flow that requested the render.' },
      },
      success: {
        type: 'boolean',
        _meta: { description: 'Whether the IaC Provisioner returned a rendered artifact.' },
      },
      httpStatus: {
        type: 'integer',
        _meta: {
          description: 'HTTP status returned by the IaC Provisioner (0 for network failure).',
        },
      },
      errorCodes: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: { description: 'IaC Provisioner errors[].code value.' },
        },
        _meta: { description: 'Provider error codes returned on failure.' },
      },
      latencyMs: {
        type: 'long',
        _meta: { description: 'Render call latency in milliseconds.' },
      },
    },
  };

export const IAC_PROVISIONER_RENDER_FALLBACK_EVENT: EventTypeOpts<IacProvisionerRenderFallbackFields> =
  {
    eventType: 'iac_provisioner_render_fallback',
    schema: {
      flow: {
        type: 'keyword',
        _meta: { description: 'The Kibana flow that fell back to the static template.' },
      },
      reason: {
        type: 'keyword',
        _meta: { description: 'Why the fallback was used (e.g. render_failed).' },
      },
    },
  };

/** Vocabulary for IAC_PROVISIONER_KEY_VERIFICATION_COMPLETED_EVENT.outcome — queried by exact string. */
export type IacKeyVerificationOutcome =
  | 'matches'
  | 'no_key'
  | 'key_mismatch'
  | 'unsupported_provider'
  | 'no_integrations'
  | 'key_unavailable';
export type IacKeySurface = 'wizard' | 'flyout';
export type IacKeyCheckAction = 'update_stack_clicked' | 'verify_clicked';
export type IacKeyCheckReason = 'no_key' | 'key_mismatch';

export interface IacKeyVerificationCompletedFields {
  /** 'wizard' when a new integration was supplied, 'flyout' otherwise. */
  surface: IacKeySurface;
  outcome: IacKeyVerificationOutcome;
  hasDeploymentId: boolean;
  integrationCount: number;
  latencyMs: number;
}

export const IAC_PROVISIONER_KEY_VERIFICATION_COMPLETED_EVENT: EventTypeOpts<IacKeyVerificationCompletedFields> =
  {
    eventType: 'iac_provisioner_key_verification_completed',
    schema: {
      surface: {
        type: 'keyword',
        _meta: {
          description:
            'UI surface that asked for the check: wizard (integration policy, Existing Identity tab) or flyout (connector details).',
        },
      },
      outcome: {
        type: 'keyword',
        _meta: {
          description:
            "Result of comparing the stored key with the current render: 'matches'; 'no_key' (connector deployed the static template); 'key_mismatch' (deployed template differs from the current render); 'unsupported_provider' (IaCP has no blueprints for this provider); 'no_integrations' (nothing renderable attached); 'key_unavailable' (IaCP unreachable or predates render=false — failed open).",
        },
      },
      hasDeploymentId: {
        type: 'boolean',
        _meta: { description: 'Whether the connector has a stored deployment id (stack ARN).' },
      },
      integrationCount: {
        type: 'integer',
        _meta: { description: 'Size of the merged integration set that was checked.' },
      },
      latencyMs: {
        type: 'long',
        _meta: { description: 'End-to-end check latency in milliseconds.' },
      },
    },
  };

export interface IacUpgradeCheckCompletedFields {
  upToDate: number;
  upgradeAvailable: number;
  skipped: number;
  durationMs: number;
}

export const IAC_PROVISIONER_UPGRADE_CHECK_COMPLETED_EVENT: EventTypeOpts<IacUpgradeCheckCompletedFields> =
  {
    eventType: 'iac_provisioner_upgrade_check_completed',
    schema: {
      upToDate: {
        type: 'integer',
        _meta: { description: 'Connectors whose stored key matched.' },
      },
      upgradeAvailable: {
        type: 'integer',
        _meta: { description: 'Connectors flagged upgrade_available (mismatch or no key).' },
      },
      skipped: {
        type: 'integer',
        _meta: {
          description:
            'Connectors skipped: unsupported provider, no policies, or IaCP unavailable.',
        },
      },
      durationMs: { type: 'long', _meta: { description: 'Task run duration in milliseconds.' } },
    },
  };

export interface IacKeyCheckActionFields {
  surface: IacKeySurface;
  action: IacKeyCheckAction;
  reason: IacKeyCheckReason;
  hasDeploymentId: boolean;
}

/** Browser-side: what users do when shown an IaC callout — the conversion signal for the feature. */
export const IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT: EventTypeOpts<IacKeyCheckActionFields> = {
  eventType: 'iac_provisioner_key_check_action',
  schema: {
    surface: {
      type: 'keyword',
      _meta: {
        description:
          'UI surface that asked for the check: wizard (integration policy, Existing Identity tab) or flyout (connector details).',
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description:
          'What the user clicked: update_stack_clicked opens the CloudFormation console with the freshly rendered template; verify_clicked re-runs the key comparison.',
      },
    },
    reason: {
      type: 'keyword',
      _meta: {
        description:
          'Why the callout was shown: no_key (static template deployed) or key_mismatch (deployed template differs from the current render).',
      },
    },
    hasDeploymentId: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the connector had a stored stack ARN, i.e. whether a stack deep link (rather than the generic console) was offered.',
      },
    },
  },
};

/**
 * Minimal registrar interface so this file works with both
 * AnalyticsServiceSetup (server) and the browser analytics client without
 * importing @kbn/core.
 */
export interface IacProvisionerAnalyticsRegistrar {
  registerEventType: <T>(opts: EventTypeOpts<T>) => void;
}

export const registerIacProvisionerTelemetryEvents = (
  analytics: IacProvisionerAnalyticsRegistrar
): void => {
  analytics.registerEventType(IAC_PROVISIONER_RENDER_REQUESTED_EVENT);
  analytics.registerEventType(IAC_PROVISIONER_RENDER_COMPLETED_EVENT);
  analytics.registerEventType(IAC_PROVISIONER_RENDER_FALLBACK_EVENT);
  analytics.registerEventType(IAC_PROVISIONER_KEY_VERIFICATION_COMPLETED_EVENT);
  analytics.registerEventType(IAC_PROVISIONER_UPGRADE_CHECK_COMPLETED_EVENT);
  analytics.registerEventType(IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT);
};
