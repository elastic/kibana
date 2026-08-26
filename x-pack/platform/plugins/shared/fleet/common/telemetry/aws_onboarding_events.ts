/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@elastic/ebt/client';

/**
 * Shared EBT event definitions + report helpers for the AWS onboarding funnel (ingest-dev#7625).
 *
 * These live in Fleet `common/` because the funnel spans multiple plugins — the entry redirect and the
 * ELB "Launch stack in AWS" button are owned by `observability_onboarding`, while credentials and the
 * agentless "Save and continue" happen in Fleet's create-package-policy page. Both `observability_onboarding`
 * and (later) `ingest_hub` already depend on `@kbn/fleet-plugin`, so defining the events + helpers here
 * lets every flow emit the identical events with no schema drift. The events are registered once from
 * Fleet's public `setup()` (core analytics is global).
 *
 * The helpers are framework-agnostic (they take an `analytics` client and a `Storage` instance) so they can
 * be called from Fleet (`useStartServices().analytics`) or the onboarding plugins (`useKibana().services.analytics`).
 */

/** sessionStorage key holding the cross-plugin funnel state (timestamps + single-fire guards). */
export const AWS_ONBOARDING_TELEMETRY_STORAGE_KEY = 'aws_onboarding.telemetry';

/** The package whose add-integration page the AWS quickstart routes to. */
export const AWS_ONBOARDING_PACKAGE_NAME = 'aws_cloudwatch_input_otel';

export type AwsOnboardingDeployPath = 'agentless' | 'aws_cloudformation';

interface FlowEnteredFields {
  package_version: string;
}
interface CredentialsAddedFields {
  duration_ms: number;
}
interface DeployClickedFields {
  duration_ms: number;
  path: AwsOnboardingDeployPath;
  services?: string[];
}
interface AgentlessEnrollmentSucceededFields {
  duration_ms: number;
}
interface FirstDataArrivedFields {
  duration_ms: number;
  package_name: string;
}
interface FirstDataTimeoutFields {
  package_name: string;
}

export const AWS_ONBOARDING_FLOW_ENTERED_EVENT: EventTypeOpts<FlowEnteredFields> = {
  eventType: 'aws_onboarding_flow_entered',
  schema: {
    package_version: {
      type: 'keyword',
      _meta: {
        description: 'Version of the aws_cloudwatch_input_otel package the user was routed to.',
      },
    },
  },
};

export const AWS_ONBOARDING_CREDENTIALS_ADDED_EVENT: EventTypeOpts<CredentialsAddedFields> = {
  eventType: 'aws_onboarding_credentials_added',
  schema: {
    duration_ms: {
      type: 'long',
      _meta: {
        description: 'Milliseconds between entering the flow and committing AWS credentials.',
      },
    },
  },
};

export const AWS_ONBOARDING_DEPLOY_CLICKED_EVENT: EventTypeOpts<DeployClickedFields> = {
  eventType: 'aws_onboarding_deploy_clicked',
  schema: {
    duration_ms: {
      type: 'long',
      _meta: { description: 'Milliseconds between entering the flow and clicking to deploy.' },
    },
    path: {
      type: 'keyword',
      _meta: {
        description:
          "Deploy path taken: 'agentless' (in-product) or 'aws_cloudformation' (Launch stack in AWS).",
      },
    },
    services: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Internal id of an AWS service/source activated on the agentless path.',
        },
      },
      _meta: { description: 'AWS services activated on the agentless path.', optional: true },
    },
  },
};

export const AWS_ONBOARDING_AGENTLESS_ENROLLMENT_SUCCEEDED_EVENT: EventTypeOpts<AgentlessEnrollmentSucceededFields> =
  {
    eventType: 'aws_onboarding_agentless_enrollment_succeeded',
    schema: {
      duration_ms: {
        type: 'long',
        _meta: {
          description: 'Milliseconds between clicking deploy and agentless enrollment succeeding.',
        },
      },
    },
  };

export const AWS_ONBOARDING_FIRST_DATA_ARRIVED_EVENT: EventTypeOpts<FirstDataArrivedFields> = {
  eventType: 'aws_onboarding_first_data_arrived',
  schema: {
    duration_ms: {
      type: 'long',
      _meta: {
        description:
          'Milliseconds between clicking deploy and first data arriving for the package.',
      },
    },
    package_name: {
      type: 'keyword',
      _meta: { description: 'Name of the AWS integration package the first data arrived for.' },
    },
  },
};

export const AWS_ONBOARDING_FIRST_DATA_TIMEOUT_EVENT: EventTypeOpts<FirstDataTimeoutFields> = {
  eventType: 'aws_onboarding_first_data_timeout',
  schema: {
    package_name: {
      type: 'keyword',
      _meta: {
        description:
          'Name of the AWS integration package whose first data did not arrive within the expected window.',
      },
    },
  },
};

export const AWS_ONBOARDING_EVENTS: Array<EventTypeOpts<any>> = [
  AWS_ONBOARDING_FLOW_ENTERED_EVENT,
  AWS_ONBOARDING_CREDENTIALS_ADDED_EVENT,
  AWS_ONBOARDING_DEPLOY_CLICKED_EVENT,
  AWS_ONBOARDING_AGENTLESS_ENROLLMENT_SUCCEEDED_EVENT,
  AWS_ONBOARDING_FIRST_DATA_ARRIVED_EVENT,
  AWS_ONBOARDING_FIRST_DATA_TIMEOUT_EVENT,
];

/** Minimal structural type for the core analytics client, to avoid importing `@kbn/core` into `common/`. */
export interface AwsOnboardingAnalyticsClient {
  reportEvent: (eventType: string, data: Record<string, unknown>) => void;
}
interface AwsOnboardingAnalyticsRegistrar {
  registerEventType: <T>(opts: EventTypeOpts<T>) => void;
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

interface FunnelState {
  flowEnteredAt?: number;
  deployClickedAt?: number;
  reported?: Record<string, boolean>;
}

function readState(storage: StorageLike): FunnelState {
  try {
    return JSON.parse(storage.getItem(AWS_ONBOARDING_TELEMETRY_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeState(storage: StorageLike, state: FunnelState): void {
  storage.setItem(AWS_ONBOARDING_TELEMETRY_STORAGE_KEY, JSON.stringify(state));
}

/** Register every AWS onboarding event type. Call once (Fleet public `setup()`); core analytics is global. */
export function registerAwsOnboardingEvents(analytics: AwsOnboardingAnalyticsRegistrar): void {
  AWS_ONBOARDING_EVENTS.forEach((event) => analytics.registerEventType(event));
}

/**
 * Start of the funnel. Resets funnel state, stamps `flowEnteredAt`, and emits `flow_entered`.
 * Call from the AWS quickstart entry point (the redirect) before navigating into the flow.
 */
export function reportAwsOnboardingFlowEntered(
  analytics: AwsOnboardingAnalyticsClient,
  storage: StorageLike,
  packageVersion: string
): void {
  writeState(storage, { flowEnteredAt: Date.now(), reported: { flow_entered: true } });
  analytics.reportEvent(AWS_ONBOARDING_FLOW_ENTERED_EVENT.eventType, {
    package_version: packageVersion,
  });
}

/** Emit `credentials_added` once, with `duration_ms` since flow entry. No-op if already reported or no flow start. */
export function reportAwsOnboardingCredentialsAdded(
  analytics: AwsOnboardingAnalyticsClient,
  storage: StorageLike
): boolean {
  const state = readState(storage);
  if (state.reported?.credentials_added || state.flowEnteredAt == null) {
    return false;
  }
  analytics.reportEvent(AWS_ONBOARDING_CREDENTIALS_ADDED_EVENT.eventType, {
    duration_ms: Math.max(0, Date.now() - state.flowEnteredAt),
  });
  writeState(storage, {
    ...state,
    reported: { ...state.reported, credentials_added: true },
  });
  return true;
}

/**
 * Emit `deploy_clicked` once per path, with `duration_ms` since flow entry. Stamps `deployClickedAt`
 * (used later by the deferred post-deploy events). No-op if this path was already reported or no flow start.
 */
export function reportAwsOnboardingDeployClicked(
  analytics: AwsOnboardingAnalyticsClient,
  storage: StorageLike,
  fields: { path: AwsOnboardingDeployPath; services?: string[] }
): boolean {
  const state = readState(storage);
  const guardKey = `deploy_clicked_${fields.path}`;
  if (state.reported?.[guardKey] || state.flowEnteredAt == null) {
    return false;
  }
  const now = Date.now();
  analytics.reportEvent(AWS_ONBOARDING_DEPLOY_CLICKED_EVENT.eventType, {
    duration_ms: Math.max(0, now - state.flowEnteredAt),
    path: fields.path,
    ...(fields.services && fields.services.length > 0 ? { services: fields.services } : {}),
  });
  writeState(storage, {
    ...state,
    deployClickedAt: now,
    reported: { ...state.reported, [guardKey]: true },
  });
  return true;
}

/** Emit `agentless_enrollment_succeeded` once, with `duration_ms` since deploy clicked. No-op if already reported or no deploy timestamp. */
export function reportAwsOnboardingEnrollmentSucceeded(
  analytics: AwsOnboardingAnalyticsClient,
  storage: StorageLike
): boolean {
  const state = readState(storage);
  if (state.reported?.enrollment_succeeded || state.deployClickedAt == null) {
    return false;
  }
  analytics.reportEvent(AWS_ONBOARDING_AGENTLESS_ENROLLMENT_SUCCEEDED_EVENT.eventType, {
    duration_ms: Math.max(0, Date.now() - state.deployClickedAt),
  });
  writeState(storage, {
    ...state,
    reported: { ...state.reported, enrollment_succeeded: true },
  });
  return true;
}

/** Emit `first_data_arrived` once per package, with `duration_ms` since deploy clicked. No-op if already reported for this package or no deploy timestamp. */
export function reportAwsOnboardingFirstDataArrived(
  analytics: AwsOnboardingAnalyticsClient,
  storage: StorageLike,
  packageName: string
): boolean {
  const state = readState(storage);
  const guardKey = `first_data_arrived_${packageName}`;
  if (state.reported?.[guardKey] || state.deployClickedAt == null) {
    return false;
  }
  analytics.reportEvent(AWS_ONBOARDING_FIRST_DATA_ARRIVED_EVENT.eventType, {
    duration_ms: Math.max(0, Date.now() - state.deployClickedAt),
    package_name: packageName,
  });
  writeState(storage, {
    ...state,
    reported: { ...state.reported, [guardKey]: true },
  });
  return true;
}

/** Emit `first_data_timeout` once per package. No-op if already reported for this package or no deploy timestamp. */
export function reportAwsOnboardingFirstDataTimeout(
  analytics: AwsOnboardingAnalyticsClient,
  storage: StorageLike,
  packageName: string
): boolean {
  const state = readState(storage);
  const guardKey = `first_data_timeout_${packageName}`;
  if (state.reported?.[guardKey] || state.deployClickedAt == null) {
    return false;
  }
  analytics.reportEvent(AWS_ONBOARDING_FIRST_DATA_TIMEOUT_EVENT.eventType, {
    package_name: packageName,
  });
  writeState(storage, {
    ...state,
    reported: { ...state.reported, [guardKey]: true },
  });
  return true;
}
