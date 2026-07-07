/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

export interface UiamProvisioningRunEventData {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  has_more_to_provision: boolean;
  has_error: boolean;
  run_number: number;
}

export const UIAM_PROVISIONING_RUN_EVENT: EventTypeOpts<UiamProvisioningRunEventData> = {
  eventType: 'uiam_api_key_provisioning_run',
  schema: {
    total: {
      type: 'long',
      _meta: {
        description:
          'Total number of rules processed in this provisioning run (completed + failed + skipped).',
        optional: false,
      },
    },
    completed: {
      type: 'long',
      _meta: {
        description: 'Number of rules successfully provisioned with UIAM API keys.',
        optional: false,
      },
    },
    failed: {
      type: 'long',
      _meta: {
        description:
          'Number of rules that failed provisioning (failed conversions and failed rule updates).',
        optional: false,
      },
    },
    skipped: {
      type: 'long',
      _meta: {
        description:
          'Number of rules skipped during provisioning (no API key, already has UIAM key, or user-created key).',
        optional: false,
      },
    },
    has_more_to_provision: {
      type: 'boolean',
      _meta: {
        description:
          'Whether there are more rules to provision in subsequent runs (batch exceeded).',
        optional: false,
      },
    },
    has_error: {
      type: 'boolean',
      _meta: {
        description: 'Whether the provisioning run failed with an error.',
        optional: false,
      },
    },
    run_number: {
      type: 'long',
      _meta: {
        description: 'The sequential run number of this provisioning task.',
        optional: false,
      },
    },
  },
};

export const uiamProvisioningEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  UIAM_PROVISIONING_RUN_EVENT,
];
