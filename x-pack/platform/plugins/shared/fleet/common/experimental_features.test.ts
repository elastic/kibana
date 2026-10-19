/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allowedExperimentalValues, getUpdatedExperimentalFeatures } from './experimental_features';

const defaultFeatures = {
  enableFoo: false,
  enableBar: true,
  enableBaz: true,
} as const;

describe('getUpdatedExperimentalFeatures', () => {
  it('should return default values if no config is provided', () => {
    const result = getUpdatedExperimentalFeatures([], {}, defaultFeatures);
    expect(result).toEqual(defaultFeatures);
  });

  it('should enable features listed in the enableExperimental config if they are not listed in experimentalFeatures', () => {
    const result = getUpdatedExperimentalFeatures(
      [
        'enableFoo', // default: false
        'enableBar', // default: true
      ],
      {},
      defaultFeatures
    );
    expect(result).toEqual({
      enableFoo: true, // enabled
      enableBar: true, // already enabled by default
      enableBaz: true, // default
    });
  });

  it('should enable or disable features listed in the experimentalFeatures config', () => {
    const result = getUpdatedExperimentalFeatures(
      [],
      {
        enableFoo: true, // default: false
        enableBar: false, // default: true,
      },
      defaultFeatures
    );
    expect(result).toEqual({
      enableFoo: true, // enabled
      enableBar: false, // disabled
      enableBaz: true, // default
    });
  });

  it('should disable features listed in the experimentalFeatures config even if they are listed in enableExperimental', () => {
    const result = getUpdatedExperimentalFeatures(
      [
        'enableFoo', // default: false
        'enableBar', // default: true
      ],
      {
        enableFoo: false, // listed in enableExperimental, but disabled here
        enableBar: false, // listed in enableExperimental, but disabled here
      },
      defaultFeatures
    );
    expect(result).toEqual({
      enableFoo: false, // disabled
      enableBar: false, // disabled
      enableBaz: true, // default
    });
  });

  it('should ignore invalid feature names in both configs', () => {
    const result = getUpdatedExperimentalFeatures(
      [
        'enableFoo', // valid
        'invalidFeature1', // invalid
      ],
      {
        enableBar: false, // valid
        invalidFeature2: true, // invalid
      },
      defaultFeatures
    );
    expect(result).toEqual({
      enableFoo: true, // enabled
      enableBar: false, // disabled
      enableBaz: true, // default
    });
  });

  it('should ignore non-boolean values in experimentalFeatures config', () => {
    const result = getUpdatedExperimentalFeatures(
      ['enableFoo'], // valid
      {
        enableBar: 'yes', // invalid, should be boolean
        enableBaz: null, // invalid, should be boolean
      } as any,
      defaultFeatures
    );
    expect(result).toEqual({
      enableFoo: true, // enabled
      enableBar: true, // default
      enableBaz: true, // default
    });
  });
});

describe('allowedExperimentalValues', () => {
  // Frozen list of legacy experimental features. Do NOT add new entries: use a Kibana feature flag instead,
  // see x-pack/platform/plugins/shared/fleet/dev_docs/feature_flags.md. Entries can only be removed.
  const legacyExperimentalFeatures = [
    'showExperimentalShipperOptions',
    'useSpaceAwareness',
    'enableAutomaticAgentUpgrades',
    'enableSyncIntegrationsOnRemote',
    'enableSSLSecrets',
    'installedIntegrationsTabularUI',
    'enabledUpgradeAgentlessDeploymentsTask',
    'enablePackageRollback',
    'enableAutoInstallContentPackages',
    'enableOtelIntegrations',
    'enableAgentStatusAlerting',
    'enableAgentPrivilegeLevelChange',
    'installIntegrationsKnowledge',
    'enableFleetPolicyRevisionsCleanupTask',
    'enableFleetOrphanedPolicySweep',
    'enableAgentRollback',
    'disableAgentlessLegacyAPI',
    'enableAgentlessPoliciesUI',
    'enableEsqlViewInstall',
    'enableSloTemplates',
    'newBrowseIntegrationUx',
    'enableVersionSpecificPolicies',
    'enableIntegrationInactivityAlerting',
    'enableSimplifiedAgentlessUX',
    'enableOpAMP',
    'enableOTelVerifier',
    'enableResolveDependencies',
    'enableOtelUI',
    'enableIncludeTagsInEvents',
    'enableIntegrationCollectionTiles',
    'enableIntegrationTileClickToAdd',
  ];

  it('should not have new experimental features, use a Kibana feature flag instead (see dev_docs/feature_flags.md)', () => {
    const newKeys = Object.keys(allowedExperimentalValues).filter(
      (key) => !legacyExperimentalFeatures.includes(key)
    );
    expect(newKeys).toEqual([]);
  });
});
