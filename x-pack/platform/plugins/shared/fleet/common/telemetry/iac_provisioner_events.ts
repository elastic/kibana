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
 * `flow` distinguishes the consumer: 'cloud_connector' for the MVP; the
 * agent-based integration flow will report its own value once it lands.
 */

export const CLOUD_CONNECTOR_RENDER_FLOW = 'cloud_connector' as const;

export type IacProvisionerRenderFlow = typeof CLOUD_CONNECTOR_RENDER_FLOW;

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
};
