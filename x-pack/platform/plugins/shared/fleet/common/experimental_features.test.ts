/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from './experimental_features';

describe('parseExperimentalConfigValue', () => {
  it('should return default values if no config is provided', () => {
    const result = parseExperimentalConfigValue([], {});
    expect(result).toEqual({
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
    });
  });

  it('should enable features listed in the enableExperimental config if they are not listed in experimentalFeatures', () => {
    const result = parseExperimentalConfigValue(
      [
        'showExperimentalShipperOptions', // default: false
        'useSpaceAwareness', // default: true
      ],
      {}
    );
    expect(result).toEqual({
      showExperimentalShipperOptions: true, // enabled
      useSpaceAwareness: true, // unchanged
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
    });
  });

  it('should enable or disable features listed in the experimentalFeatures config', () => {
    const result = parseExperimentalConfigValue([], {
      showExperimentalShipperOptions: true, // default: false
      useSpaceAwareness: false, // default: true
    });
    expect(result).toEqual({
      showExperimentalShipperOptions: true, // enabled
      useSpaceAwareness: false, // disabled
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
    });
  });

  it('should disable features listed in the experimentalFeatures config even if they are listed in enableExperimental', () => {
    const result = parseExperimentalConfigValue(
      [
        'showExperimentalShipperOptions', // default: false
        'useSpaceAwareness', // default: true
        'enableSSLSecrets', // default: false
      ],
      {
        showExperimentalShipperOptions: false, // listed in enableExperimental, but disabled here
        useSpaceAwareness: false, // listed in enableExperimental, but disabled here
        enableSSLSecrets: true, // listed in enableExperimental, but enabled here
      }
    );
    expect(result).toEqual({
      showExperimentalShipperOptions: false, // disabled
      useSpaceAwareness: false, // disabled
      enableSSLSecrets: true, // enabled
      enableAutomaticAgentUpgrades: true,
      enableSyncIntegrationsOnRemote: true,
      installedIntegrationsTabularUI: true,
      enabledUpgradeAgentlessDeploymentsTask: true,
      enablePackageRollback: false,
      enableAutoInstallContentPackages: true,
      enableOtelIntegrations: true,
      enableAgentStatusAlerting: true,
      enableAgentPrivilegeLevelChange: false,
    });
  });
});
