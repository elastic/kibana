/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { ModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';

import { getSavedObjectTypes } from '../..';

import type { PackagePolicy } from '../../../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';

describe('backfill for modelVersion 10 - fix on_write_scan field', () => {
  let migrator: ModelVersionTestMigrator;
  let policyConfigSO: SavedObject<PackagePolicy>;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({
      type: getSavedObjectTypes()[PACKAGE_POLICY_SAVED_OBJECT_TYPE],
    });

    policyConfigSO = {
      id: 'mock-saved-object-id',
      attributes: {
        name: 'Some Policy Name',
        package: {
          name: 'endpoint',
          title: '',
          version: '',
        },
        id: 'endpoint',
        policy_id: '',
        policy_ids: [],
        enabled: true,
        namespace: '',
        revision: 0,
        updated_at: '',
        updated_by: '',
        created_at: '',
        created_by: '',
        inputs: [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              policy: {
                value: {
                  windows: {
                    malware: {
                      mode: 'detect',
                    },
                    antivirus_registration: {
                      enabled: true,
                    },
                  },
                  mac: {
                    malware: {
                      mode: 'detect',
                    },
                  },
                  linux: {
                    malware: {
                      mode: 'detect',
                    },
                  },
                },
              },
            },
          },
        ],
      },
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      references: [],
    };
  });

  describe('when updating to model version 10', () => {
    it('should change `on_write_scan` from `true` to `false` if Malware is off', () => {
      setMalwareMode(policyConfigSO, 'off');
      setOnWriteScan(policyConfigSO, true);

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: policyConfigSO,
        fromVersion: 9,
        toVersion: 10,
      });

      expectOnWriteScanToBe(false, migratedPolicyConfigSO);
    });

    it('should not change `on_write_scan` if Malware is detect', () => {
      setMalwareMode(policyConfigSO, 'detect');
      setOnWriteScan(policyConfigSO, true);

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: policyConfigSO,
        fromVersion: 9,
        toVersion: 10,
      });

      expectOnWriteScanToBe(true, migratedPolicyConfigSO);
    });

    it('should not change `on_write_scan` if Malware is prevent', () => {
      setMalwareMode(policyConfigSO, 'prevent');
      setOnWriteScan(policyConfigSO, true);

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: policyConfigSO,
        fromVersion: 9,
        toVersion: 10,
      });

      expectOnWriteScanToBe(true, migratedPolicyConfigSO);
    });
  });

  describe('additional test: when updating from model version 5 to model version 10', () => {
    it('should add `on_write_scan=false` if Malware is off', () => {
      setMalwareMode(policyConfigSO, 'off');

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: policyConfigSO,
        fromVersion: 5,
        toVersion: 10,
      });

      expectOnWriteScanToBe(false, migratedPolicyConfigSO);
    });

    it('should add `on_write_scan=true` if Malware is detect', () => {
      setMalwareMode(policyConfigSO, 'detect');

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: policyConfigSO,
        fromVersion: 5,
        toVersion: 10,
      });

      expectOnWriteScanToBe(true, migratedPolicyConfigSO);
    });

    it('should add `on_write_scan=true` if Malware is prevent', () => {
      setMalwareMode(policyConfigSO, 'prevent');

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: policyConfigSO,
        fromVersion: 5,
        toVersion: 10,
      });

      expectOnWriteScanToBe(true, migratedPolicyConfigSO);
    });
  });

  const setMalwareMode = (so: SavedObject<PackagePolicy>, level: 'off' | 'detect' | 'prevent') => {
    const config = so.attributes.inputs[0].config?.policy.value;

    config.windows.malware.mode = level;
    config.mac.malware.mode = level;
    config.linux.malware.mode = level;
  };

  const setOnWriteScan = (so: SavedObject<PackagePolicy>, value: boolean) => {
    const config = so.attributes.inputs[0].config?.policy.value;

    config.windows.malware.on_write_scan = value;
    config.mac.malware.on_write_scan = value;
    config.linux.malware.on_write_scan = value;
  };

  const expectOnWriteScanToBe = (expectedValue: boolean, so: SavedObject<PackagePolicy>) => {
    const config = so.attributes.inputs[0].config?.policy.value;

    expect(config.windows.malware.on_write_scan).toBe(expectedValue);
    expect(config.mac.malware.on_write_scan).toBe(expectedValue);
    expect(config.linux.malware.on_write_scan).toBe(expectedValue);
  };
});
