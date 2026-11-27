/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { FeatureRegistry } from '@kbn/features-plugin/server/feature_registry';
import {
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  OAUTH_STATE_SAVED_OBJECT_TYPE,
  USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';
import {
  ACTIONS_FEATURE,
  ACTIONS_FEATURE_V2,
  ACTIONS_V2_FEATURE_ID,
  EXECUTE_CONNECTORS_PRIVILEGE_API_TAG,
  OAUTH_API_TAG,
} from './feature';

const IMPLICIT_PRIVILEGE_IDS = ['all', 'read', 'minimal_all', 'minimal_read'] as const;

const getSubFeaturePrivileges = (feature: KibanaFeatureConfig) =>
  (feature.subFeatures ?? []).flatMap((subFeature) =>
    subFeature.privilegeGroups.flatMap((group) => group.privileges)
  );

const getReplacedByReferences = (
  replacedBy:
    | readonly { feature: string; privileges: readonly string[] }[]
    | {
        default: readonly { feature: string; privileges: readonly string[] }[];
        minimal: readonly { feature: string; privileges: readonly string[] }[];
      }
    | undefined
) => {
  if (!replacedBy) {
    return [];
  }
  return 'default' in replacedBy ? [...replacedBy.default, ...replacedBy.minimal] : [...replacedBy];
};

describe('Actions feature privileges', () => {
  test('registers both features without feature registry errors', () => {
    const featureRegistry = new FeatureRegistry();
    featureRegistry.registerKibanaFeature(ACTIONS_FEATURE_V2);
    featureRegistry.registerKibanaFeature(ACTIONS_FEATURE);
    featureRegistry.lockRegistration();

    expect(() => featureRegistry.validateFeatures()).not.toThrow();
  });

  test('actions_v2 read cannot execute and does not grant action_task_params', () => {
    expect(ACTIONS_FEATURE_V2.id).toBe(ACTIONS_V2_FEATURE_ID);
    expect(ACTIONS_FEATURE_V2.deprecated).toBeUndefined();
    expect(ACTIONS_FEATURE_V2.excludeFromBasePrivileges).not.toBe(true);
    expect(ACTIONS_FEATURE_V2.privileges?.read?.ui).not.toContain('execute');
    expect(ACTIONS_FEATURE_V2.privileges?.read?.savedObject.all).not.toContain(
      ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE
    );
    expect(ACTIONS_FEATURE_V2.privileges?.all?.ui).not.toContain('execute');
    expect(ACTIONS_FEATURE_V2.privileges?.all?.savedObject.all).not.toContain(
      ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE
    );
    expect(ACTIONS_FEATURE_V2.privileges?.read?.api).toContain(OAUTH_API_TAG);
    expect(ACTIONS_FEATURE_V2.privileges?.read?.savedObject.all).toEqual(
      expect.arrayContaining([
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        OAUTH_STATE_SAVED_OBJECT_TYPE,
        USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
      ])
    );
  });

  test('actions_v2 execute sub-feature is independent and included in all', () => {
    const executePrivilege = getSubFeaturePrivileges(ACTIONS_FEATURE_V2).find(
      (privilege) => privilege.id === 'execute'
    );

    expect(executePrivilege).toEqual(
      expect.objectContaining({
        id: 'execute',
        includeIn: 'all',
        api: [EXECUTE_CONNECTORS_PRIVILEGE_API_TAG],
        savedObject: { all: [ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE], read: [] },
        ui: ['execute'],
      })
    );

    const executeGroup = ACTIONS_FEATURE_V2.subFeatures
      ?.flatMap((subFeature) => subFeature.privilegeGroups)
      .find((group) => group.privileges.some((privilege) => privilege.id === 'execute'));
    expect(executeGroup?.groupType).toBe('independent');
  });

  test('deprecated actions keeps execute for existing roles and maps every privilege', () => {
    expect(ACTIONS_FEATURE.id).toBe('actions');
    expect(ACTIONS_FEATURE.deprecated?.notice).toEqual(expect.any(String));
    expect(ACTIONS_FEATURE.deprecated?.replacedBy).toEqual([ACTIONS_V2_FEATURE_ID]);
    expect(ACTIONS_FEATURE.excludeFromBasePrivileges).toBe(true);
    expect(ACTIONS_FEATURE.privileges?.all?.api).toContain(EXECUTE_CONNECTORS_PRIVILEGE_API_TAG);
    expect(ACTIONS_FEATURE.privileges?.read?.api).toContain(EXECUTE_CONNECTORS_PRIVILEGE_API_TAG);
    expect(ACTIONS_FEATURE.privileges?.all?.replacedBy).toEqual({
      default: [{ feature: ACTIONS_V2_FEATURE_ID, privileges: ['all'] }],
      minimal: [{ feature: ACTIONS_V2_FEATURE_ID, privileges: ['minimal_all', 'execute'] }],
    });
    expect(ACTIONS_FEATURE.privileges?.read?.replacedBy).toEqual({
      default: [{ feature: ACTIONS_V2_FEATURE_ID, privileges: ['read', 'execute'] }],
      minimal: [{ feature: ACTIONS_V2_FEATURE_ID, privileges: ['minimal_read', 'execute'] }],
    });

    const subFeaturePrivileges = getSubFeaturePrivileges(ACTIONS_FEATURE);
    expect(subFeaturePrivileges.length).toBeGreaterThan(0);
    for (const privilege of subFeaturePrivileges) {
      expect(privilege.replacedBy).toEqual([
        { feature: ACTIONS_V2_FEATURE_ID, privileges: [privilege.id] },
      ]);
    }
  });

  test('every replacedBy privilege id exists on actions_v2', () => {
    const v2PrivilegeIds = new Set<string>([
      ...IMPLICIT_PRIVILEGE_IDS,
      ...getSubFeaturePrivileges(ACTIONS_FEATURE_V2).map((privilege) => privilege.id),
    ]);

    const references = [
      ...getReplacedByReferences(ACTIONS_FEATURE.privileges?.all?.replacedBy),
      ...getReplacedByReferences(ACTIONS_FEATURE.privileges?.read?.replacedBy),
      ...getSubFeaturePrivileges(ACTIONS_FEATURE).flatMap((privilege) =>
        getReplacedByReferences(privilege.replacedBy)
      ),
    ];

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(reference.feature).toBe(ACTIONS_V2_FEATURE_ID);
      for (const privilegeId of reference.privileges) {
        expect(v2PrivilegeIds.has(privilegeId)).toBe(true);
      }
    }
  });
});
