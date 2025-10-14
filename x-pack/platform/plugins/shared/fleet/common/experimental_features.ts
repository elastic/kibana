/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExperimentalFeatures = typeof allowedExperimentalValues;

const _allowedExperimentalValues = {
  showExperimentalShipperOptions: false,
  useSpaceAwareness: true,
  enableAutomaticAgentUpgrades: true,
  enableSyncIntegrationsOnRemote: true,
  enableSSLSecrets: false,
  installedIntegrationsTabularUI: true,
  enabledUpgradeAgentlessDeploymentsTask: true,
  enablePackageRollback: false,
  enableAutoInstallContentPackages: true,
  enableOtelIntegrations: true,
  enableAgentStatusAlerting: true,
  enableAgentPrivilegeLevelChange: false,
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
 * Parses two settings in kibana configuration:
 * 1. xpack.fleet.enableExperimental: an array of experimental values to enable
 * 2. xpack.fleet.experimentalFeatures: an object that associates a boolean to experimental values to enable or disable them
 *
 * The objective is to make xpack.fleet.experimentalFeatures the source of truth, while keeping
 * xpack.fleet.enableExperimental for backward compatibility.
 * In case of conflict, xpack.fleet.experimentalFeatures takes precedence over xpack.fleet.enableExperimental.
 *
 * @param enableExperimentalConfigValue the value of xpack.fleet.enableExperimental
 * @param experimentalFeaturesConfigValue the value of xpack.fleet.experimentalFeatures
 */
export const parseExperimentalConfigValue = (
  enableExperimentalConfigValue: string[],
  experimentalFeaturesConfigValue: { [k: string]: boolean }
): ExperimentalFeatures => {
  const enabledFeatures: Mutable<ExperimentalFeatures> = { ...allowedExperimentalValues };

  for (const value of enableExperimentalConfigValue) {
    if (isValidExperimentalValue(value)) {
      enabledFeatures[value] = true;
    }
  }

  for (const [key, value] of Object.entries(experimentalFeaturesConfigValue)) {
    if (isValidExperimentalValue(key) && typeof value === 'boolean') {
      enabledFeatures[key] = value;
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
