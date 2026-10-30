/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  FeatureKibanaPrivilegesReference,
  KibanaFeatureConfig,
} from '@kbn/features-plugin/common';
import { CASES_CONNECTORS_CAPABILITY, FEATURE_ID_V4 } from '../../common/constants';
import { CASES_CONNECTORS_SUB_PRIVILEGE_ID } from './constants';

/** Every Cases feature that `casesV4` replaces, for all three solutions. */
export const LEGACY_CASES_FEATURE_IDS = [
  'generalCases',
  'generalCasesV2',
  'generalCasesV3',
  'securitySolutionCases',
  'securitySolutionCasesV2',
  'securitySolutionCasesV3',
  'observabilityCases',
  'observabilityCasesV2',
  'observabilityCasesV3',
] as const;

const V3_CASES_FEATURE_IDS: ReadonlySet<string> = new Set([
  'generalCasesV3',
  'securitySolutionCasesV3',
  'observabilityCasesV3',
]);

const isLegacyCasesFeature = (id: string) =>
  (LEGACY_CASES_FEATURE_IDS as readonly string[]).includes(id);

// V3 privilege ids (all, read, minimal_*, and every sub-feature id) exist unchanged on casesV4,
// so pointing a V3 reference at casesV4 keeps the exact privilege.
const retarget = (
  references: readonly FeatureKibanaPrivilegesReference[]
): FeatureKibanaPrivilegesReference[] =>
  references.map((reference) =>
    V3_CASES_FEATURE_IDS.has(reference.feature)
      ? { ...reference, feature: FEATURE_ID_V4 }
      : reference
  );

type ReplacedBy = NonNullable<
  NonNullable<NonNullable<KibanaFeatureConfig['privileges']>['all']>['replacedBy']
>;

const retargetReplacedBy = (replacedBy: ReplacedBy): ReplacedBy =>
  'default' in replacedBy
    ? { default: retarget(replacedBy.default), minimal: retarget(replacedBy.minimal) }
    : retarget(replacedBy);

const toV4 = (privilegeId: string, minimalId: string): ReplacedBy => ({
  default: [{ feature: FEATURE_ID_V4, privileges: [privilegeId] }],
  minimal: [{ feature: FEATURE_ID_V4, privileges: [minimalId] }],
});

/**
 * Deprecates a legacy Cases feature in favor of `casesV4`. V1 and V2 already point at their V3;
 * those references move to `casesV4`, because a `replacedBy` may not target a deprecated feature.
 * Any other feature is returned unchanged.
 */
export const withCasesV4Replacement = (
  feature: KibanaFeatureConfig,
  { disabledSubFeaturePrivileges = [] }: { disabledSubFeaturePrivileges?: readonly string[] } = {}
): KibanaFeatureConfig => {
  if (!isLegacyCasesFeature(feature.id) || feature.privileges == null) {
    return feature;
  }

  // casesV4 grants connectors through a sub-feature privilege, which its minimal privileges do not
  // include, while a legacy privilege granted them directly. A disabled privilege cannot be
  // referenced, and a tier that disables it never granted connectors anyway.
  const connectorsAvailable = !disabledSubFeaturePrivileges.includes(
    CASES_CONNECTORS_SUB_PRIVILEGE_ID
  );
  const withConnectors = (privilege: typeof all, replacedBy: ReplacedBy): ReplacedBy => {
    if (
      !connectorsAvailable ||
      !privilege.ui?.includes(CASES_CONNECTORS_CAPABILITY) ||
      !('default' in replacedBy)
    ) {
      return replacedBy;
    }
    return {
      default: replacedBy.default,
      minimal: replacedBy.minimal.map((reference) =>
        reference.feature === FEATURE_ID_V4
          ? {
              ...reference,
              privileges: [...reference.privileges, CASES_CONNECTORS_SUB_PRIVILEGE_ID],
            }
          : reference
      ),
    };
  };

  const { all, read } = feature.privileges;
  const replace = (privilege: typeof all, privilegeId: 'all' | 'read'): typeof all => ({
    ...privilege,
    replacedBy: withConnectors(
      privilege,
      privilege.replacedBy
        ? retargetReplacedBy(privilege.replacedBy)
        : toV4(privilegeId, `minimal_${privilegeId}`)
    ),
  });

  return {
    ...feature,
    deprecated: {
      notice: i18n.translate('xpack.cases.features.casesFeatureV4.deprecationMessage', {
        defaultMessage:
          'The {currentId} permissions are deprecated, please see {casesFeatureIdV4}.',
        values: { currentId: feature.id, casesFeatureIdV4: FEATURE_ID_V4 },
      }),
    },
    privileges: { all: replace(all, 'all'), read: replace(read, 'read') },
    subFeatures: feature.subFeatures?.map((subFeature) => ({
      ...subFeature,
      privilegeGroups: subFeature.privilegeGroups.map((group) => ({
        ...group,
        privileges: group.privileges.map((privilege) => ({
          ...privilege,
          replacedBy: privilege.replacedBy
            ? retarget(privilege.replacedBy)
            : [{ feature: FEATURE_ID_V4, privileges: [privilege.id] }],
        })),
      })),
    })),
  };
};
