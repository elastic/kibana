/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelTransformationContext } from '@kbn/core-saved-objects-server';

import { migrateCspPackagePolicyToV8110 as migration } from './to_v8_11_0';

describe('8.11.0 Cloud Security Posture Package Policy migration', () => {
  const policyDoc = (
    accountType: string,
    isAccountTypeCorrect: boolean,
    packageName: string
  ): any => {
    return {
      id: 'mock-saved-csp-object-id',
      attributes: {
        name: 'cloud_security_posture_test',
        package: {
          name: packageName,
          title: '',
          version: '',
        },
        id: 'ID_123',
        policy_id: '',
        enabled: true,
        namespace: '',
        revision: 0,
        updated_at: '',
        updated_by: '',
        created_at: '',
        created_by: '',
        inputs: [
          {
            type: accountType,
            enabled: true,
            streams: [
              {
                vars: {
                  ...(isAccountTypeCorrect && {
                    'gcp.account_type': { value: 'single-account', type: 'text' },
                  }),
                },
              },
            ],
            config: {},
          },
        ],
      },
      type: ' nested',
    };
  };

  it('adds gcp.account_type to policy, set to single', () => {
    const initialDoc = policyDoc('cloudbeat/cis_gcp', false, 'cloud_security_posture');
    const migratedDoc = policyDoc('cloudbeat/cis_gcp', true, 'cloud_security_posture');
    expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
      attributes: migratedDoc.attributes,
    });
  });

  it('if there are no type cloudbeat/cis_gcp, do not add gcp.account_type', () => {
    const initialDoc = policyDoc('cloudbeat/cis_aws', false, 'cloud_security_posture');
    const migratedDoc = policyDoc('cloudbeat/cis_aws', false, 'cloud_security_posture');
    expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
      attributes: migratedDoc.attributes,
    });
  });

  it('if there are no cloud_security_posture package, do not change the doc', () => {
    const initialDoc = policyDoc('cloudbeat/cis_gcp', false, 'NOT_cloud_security_posture');
    const migratedDoc = policyDoc('cloudbeat/cis_gcp', false, 'NOT_cloud_security_posture');
    expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
      attributes: migratedDoc.attributes,
    });
  });

  it('if gcp.account_type exist and already has a value, do not set it to single-account', () => {
    const policyDocWithAccountType = (): any => {
      return {
        id: 'mock-saved-csp-object-id',
        attributes: {
          name: 'cloud_security_posture_test',
          package: {
            name: 'cloud_security_posture',
            title: '',
            version: '',
          },
          id: 'ID_1234',
          policy_id: '',
          enabled: true,
          namespace: '',
          revision: 0,
          updated_at: '',
          updated_by: '',
          created_at: '',
          created_by: '',
          inputs: [
            {
              type: 'cloudbeat/cis_gcp',
              enabled: true,
              streams: [
                {
                  vars: {
                    'gcp.account_type': { value: 'single-account-MAYBE', type: 'text' },
                  },
                },
              ],
              config: {},
            },
          ],
        },
        type: ' nested',
      };
    };
    const initialDoc = policyDocWithAccountType();
    const migratedDoc = policyDocWithAccountType();
    expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
      attributes: migratedDoc.attributes,
    });
  });
});
