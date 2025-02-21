/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExperimentalFeatures = typeof allowedExperimentalValues;

const _allowedExperimentalValues = {
  showExperimentalShipperOptions: false,
  useSpaceAwareness: false,
  enableAutomaticAgentUpgrades: false,
  enableSyncIntegrationsOnRemote: false,
};

/**
 * A list of allowed values that can be used in `xpack.fleet.enableExperimental`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze<
  Record<keyof typeof _allowedExperimentalValues, boolean>
>({ ..._allowedExperimentalValues });

type ExperimentalConfigKey = keyof ExperimentalFeatures;
type ExperimentalConfigKeys = ExperimentalConfigKey[];
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const allowedKeys = Object.keys(allowedExperimentalValues) as Readonly<ExperimentalConfigKeys>;

/**
 * Parses the string value used in `xpack.fleet.enableExperimental` kibana configuration,
 * which should be a string of values delimited by a comma (`,`)
 *
 * @param configValue
 */
export const parseExperimentalConfigValue = (configValue: string[]): ExperimentalFeatures => {
  const enabledFeatures: Mutable<ExperimentalFeatures> = { ...allowedExperimentalValues };

  for (const value of configValue) {
    if (isValidExperimentalValue(value)) {
      enabledFeatures[value] = true;
    }
  }

  return {
    ...allowedExperimentalValues,
    ...enabledFeatures,
  };
};

export const isValidExperimentalValue = (value: string): value is ExperimentalConfigKey => {
  return (allowedKeys as string[]).includes(value);
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
