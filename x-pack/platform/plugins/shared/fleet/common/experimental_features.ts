/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
 * A list of allowed values that can be used in `xpack.fleet.enableExperimental` and `xpack.fleet.experimentalFeatures`.
 * This object is then used to validate and parse the value entered.
 */
export const allowedExperimentalValues = Object.freeze<
  Record<keyof typeof _allowedExperimentalValues, boolean>
>({ ..._allowedExperimentalValues });

export type ExperimentalFeatures = typeof allowedExperimentalValues;

type ExperimentalConfigKey = keyof ExperimentalFeatures;
type ExperimentalConfigKeys = ExperimentalConfigKey[];

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
 * @returns an object with experimental features and their boolean values
 */
export const parseExperimentalConfigValue = (
  enableExperimentalConfigValue: string[],
  experimentalFeaturesConfigValue: Partial<ExperimentalFeatures>
): ExperimentalFeatures => {
  return getUpdatedExperimentalFeatures(
    enableExperimentalConfigValue,
    experimentalFeaturesConfigValue,
    allowedExperimentalValues
  );
};

/**
 * Parses and merges two config values into a single object representing experimental features.
 * Made to be generic for easier testing.
 *
 * @param enableExperimentalConfigValue an array of strings that are experimental feature values
 * @param experimentalFeaturesConfigValue an object with string keys (experimental feature names) and boolean values
 * @param existingFeatures an object with pre-existing experimental features and their default values
 * @returns an object with experimental features values updated based on the two config values provided
 */
export const getUpdatedExperimentalFeatures = <T extends Record<string, boolean>>(
  enableExperimentalConfigValue: string[],
  experimentalFeaturesConfigValue: { [k: string]: boolean },
  existingFeatures: T
): T => {
  const updatedFeatures = { ...existingFeatures };

  for (const value of enableExperimentalConfigValue) {
    if (Object.prototype.hasOwnProperty.call(existingFeatures, value)) {
      updatedFeatures[value as keyof T] = true as T[keyof T];
    }
  }

  for (const [key, value] of Object.entries(experimentalFeaturesConfigValue)) {
    if (Object.prototype.hasOwnProperty.call(existingFeatures, key) && typeof value === 'boolean') {
      updatedFeatures[key as keyof T] = value as T[keyof T];
    }
  }

  return updatedFeatures;
};

export const isValidExperimentalValue = (value: string): value is ExperimentalConfigKey => {
  return (allowedKeys as string[]).includes(value);
};

export const getExperimentalAllowedValues = (): string[] => [...allowedKeys];
