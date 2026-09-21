/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  type RunQuotaGroup,
  type RunQuotaSettings,
} from '../../../common/run_quotas';

export const RUN_QUOTA_SETTINGS_SO_TYPE = 'significant-events-run-quota-settings';
export const RUN_QUOTA_SETTINGS_SO_ID = RUN_QUOTA_SETTINGS_SO_TYPE;
export const RUN_QUOTA_LEDGER_SO_TYPE = 'significant-events-run-quota-ledger';

const RUN_QUOTA_DATE_MAX_LENGTH = 10;
const RUN_QUOTA_GROUP_MAX_LENGTH = 64;
const validateInteger = (value: number): string | undefined =>
  Number.isInteger(value) ? undefined : 'Value must be an integer.';

export interface RunQuotaSettingsAttributes
  extends Omit<RunQuotaSettings, 'limits'>,
    Record<string, unknown> {
  limits: Record<RunQuotaGroup, number> & Record<string, number>;
}

export interface RunQuotaLedgerAttributes extends Record<string, unknown> {
  date: string;
  group: RunQuotaGroup;
  count: number;
}

const runQuotaSettingsAttributesV1 = schema.object({
  enabled: schema.boolean(),
  limits: schema.recordOf(
    schema.string({ maxLength: RUN_QUOTA_GROUP_MAX_LENGTH }),
    schema.number({ min: MIN_RUN_LIMIT, max: MAX_RUN_LIMIT, validate: validateInteger })
  ),
});

const runQuotaLedgerAttributesV1 = schema.object({
  date: schema.string({ maxLength: RUN_QUOTA_DATE_MAX_LENGTH }),
  group: schema.oneOf([
    schema.literal('detection'),
    schema.literal('investigation'),
    schema.literal('ki_extraction'),
  ]),
  count: schema.number({ min: 0, validate: validateInteger }),
});

export const runQuotaSettingsSavedObjectType: SavedObjectsType = {
  name: RUN_QUOTA_SETTINGS_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: runQuotaSettingsAttributesV1.extends({}, { unknowns: 'ignore' }),
        create: runQuotaSettingsAttributesV1.extends({}, { unknowns: 'allow' }),
      },
    },
  },
};

export const runQuotaLedgerSavedObjectType: SavedObjectsType = {
  name: RUN_QUOTA_LEDGER_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: runQuotaLedgerAttributesV1.extends({}, { unknowns: 'ignore' }),
        create: runQuotaLedgerAttributesV1.extends({}, { unknowns: 'allow' }),
      },
    },
  },
};
