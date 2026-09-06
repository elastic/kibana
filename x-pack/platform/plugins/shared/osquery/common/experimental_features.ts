/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A list of allowed values that can be used in `xpack.osquery.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze({
  /**
   * Enables the "Export Results" button and server-side streaming export endpoints
   * for downloading osquery results as NDJSON, JSON, or CSV files.
   */
  exportResults: true,
  /**
   * Enables RFC 5545 RRULE-based recurrence scheduling for packs and pack queries
   * as an alternative to native interval-based scheduling. When enabled, the
   * pack form and pack query flyout expose a Schedule section, the API accepts
   * `schedule_type` / `interval` (pack-level) / `rrule_schedule` fields, and the
   * Fleet config fans the pack-level schedule onto each query that doesn't have
   * its own override. Requires osquerybeat with RRULE support.
   */
  rruleScheduling: true,
  /**
   * Enables osquery cross-project search (CPS) read support on serverless. When enabled, osquery
   * result and action-response reads fan out across linked projects as the current user, and the
   * read-only CPS project picker is registered on osquery pages. Fan-out additionally requires the
   * request to resolve at least one linked project via `cps.isCpsActive()`, so a serverless project
   * with no linked projects reads exactly as it did before CPS. Has no effect on stateful Kibana.
   */
  crossProjectSearch: false,
});

type ExperimentalFeatures = { [K in keyof typeof allowedExperimentalValues]: boolean };

type ExperimentalConfigKeys = Array<keyof ExperimentalFeatures>;
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

const disableExperimentalPrefix = 'disable:' as const;

/**
 * Parses the string value used in `xpack.osquery.enableExperimental` kibana configuration,
 * which should be an array of strings corresponding to allowedExperimentalValues keys.
 * Use the `disable:` prefix to disable a feature.
 *
 * @param configValue
 */
export const parseExperimentalConfigValue = (
  configValue: string[]
): { features: ExperimentalFeatures; invalid: string[] } => {
  const enabledFeatures: Mutable<Partial<ExperimentalFeatures>> = {};
  const invalidKeys: string[] = [];

  for (let value of configValue) {
    const isDisabled = value.startsWith(disableExperimentalPrefix);

    if (isDisabled) {
      value = value.replace(disableExperimentalPrefix, '');
    }

    if (!allowedKeys.includes(value as keyof ExperimentalFeatures)) {
      invalidKeys.push(value);
    } else {
      enabledFeatures[value as keyof ExperimentalFeatures] = !isDisabled;
    }
  }

  return {
    features: {
      ...allowedExperimentalValues,
      ...enabledFeatures,
    },
    invalid: invalidKeys,
  };
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];

export type { ExperimentalFeatures };
