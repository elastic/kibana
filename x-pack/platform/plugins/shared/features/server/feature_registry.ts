/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, uniq } from 'lodash';
import { ILicense } from '@kbn/licensing-plugin/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  KibanaFeatureConfig,
  KibanaFeature,
  FeatureKibanaPrivileges,
  ElasticsearchFeatureConfig,
  ElasticsearchFeature,
  SubFeaturePrivilegeConfig,
  KibanaFeatureScope,
} from '../common';
import { validateKibanaFeature, validateElasticsearchFeature } from './feature_schema';
import type { ConfigOverridesType } from './config';

/**
 * Describes parameters used to retrieve all Kibana features (for internal consumers).
 */
export interface GetKibanaFeaturesParamsInternal {
  /**
   * If provided, the license will be used to filter out features that require a license higher than the specified one.
   * */
  license?: ILicense;

  /**
   * If true, features that require a license higher than the one provided in the `license` will be included.
   */
  ignoreLicense?: boolean;

  /**
   * If true, deprecated features will be omitted. For backward compatibility reasons, deprecated features are included
   * in the result by default.
   */
  omitDeprecated?: boolean;
}

/**
 * Describes parameters used to retrieve all Kibana features (for public consumers).
 */
export interface GetKibanaFeaturesParams {
  /**
   * If true, deprecated features will be omitted. For backward compatibility reasons, deprecated features are included
   * in the result by default.
   */
  omitDeprecated: boolean;
}

export class FeatureRegistry {
  private locked = false;
  private kibanaFeatures: Record<string, KibanaFeatureConfig> = {};
  private esFeatures: Record<string, ElasticsearchFeatureConfig> = {};

  public lockRegistration() {
    this.locked = true;
  }

  public registerKibanaFeature(feature: KibanaFeatureConfig) {
    if (this.locked) {
      throw new Error(
        `Features are locked, can't register new features. Attempt to register ${feature.id} failed.`
      );
    }

    validateKibanaFeature(feature);

    if (feature.id in this.kibanaFeatures || feature.id in this.esFeatures) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    if (!feature.scope) {
      feature.scope = [KibanaFeatureScope.Security];
    }

    const featureCopy = cloneDeep(feature);

    this.kibanaFeatures[feature.id] = applyAutomaticPrivilegeGrants(featureCopy);
  }

  public registerElasticsearchFeature(feature: ElasticsearchFeatureConfig) {
    if (this.locked) {
      throw new Error(
        `Features are locked, can't register new features. Attempt to register ${feature.id} failed.`
      );
    }

    if (feature.id in this.kibanaFeatures || feature.id in this.esFeatures) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    validateElasticsearchFeature(feature);

    const featureCopy = cloneDeep(feature);

    this.esFeatures[feature.id] = featureCopy;
  }

  /**
   * Updates definitions for the registered features using configuration overrides, if any.
   */
  public applyOverrides(overrides: ConfigOverridesType) {
    for (const [featureId, featureOverride] of Object.entries(overrides)) {
      const feature = this.kibanaFeatures[featureId];
      if (!feature) {
        throw new Error(
          `Cannot override feature "${featureId}" since feature with such ID is not registered.`
        );
      }

      if (featureOverride.hidden) {
        feature.hidden = featureOverride.hidden;
      }

      // Note that the name doesn't currently support localizable strings. We'll revisit this approach when i18n support
      // becomes necessary.
      if (featureOverride.name) {
        feature.name = featureOverride.name;
      }

      if (featureOverride.category) {
        feature.category = DEFAULT_APP_CATEGORIES[featureOverride.category];
      }

      if (featureOverride.order != null) {
        feature.order = featureOverride.order;
      }

      if (featureOverride.privileges) {
        for (const [privilegeId, privilegeOverride] of Object.entries(featureOverride.privileges)) {
          const typedPrivilegeId = privilegeId as 'read' | 'all';
          const targetPrivilege = feature.privileges?.[typedPrivilegeId];
          if (!targetPrivilege) {
            throw new Error(
              `Cannot override privilege "${privilegeId}" of feature "${featureId}" since "${privilegeId}" privilege is not registered.`
            );
          }

          for (const featureReference of privilegeOverride.composedOf ?? []) {
            const referencedFeature = this.kibanaFeatures[featureReference.feature];
            if (!referencedFeature) {
              throw new Error(
                `Cannot compose privilege "${privilegeId}" of feature "${featureId}" with privileges of feature "${featureReference.feature}" since such feature is not registered.`
              );
            }

            // Collect all known feature and sub-feature privileges for the referenced feature.
            const knownPrivileges = new Map(
              Object.entries(referencedFeature.privileges ?? {}).concat(
                collectSubFeaturesPrivileges(referencedFeature)
              )
            );

            for (const privilegeReference of featureReference.privileges) {
              const referencedPrivilege = knownPrivileges.get(privilegeReference);
              if (!referencedPrivilege) {
                throw new Error(
                  `Cannot compose privilege "${privilegeId}" of feature "${featureId}" with privilege "${privilegeReference}" of feature "${featureReference.feature}" since such privilege is not registered.`
                );
              }
            }
          }

          // It's safe to assume that `feature.privileges` is defined here since we've checked it above.
          feature.privileges![typedPrivilegeId] = { ...targetPrivilege, ...privilegeOverride };
        }
      }

      if (featureOverride.subFeatures?.privileges) {
        // Collect all known sub-feature privileges for the feature.
        const knownPrivileges = new Map(collectSubFeaturesPrivileges(feature));
        if (knownPrivileges.size === 0) {
          throw new Error(
            `Cannot override sub-feature privileges of feature "${featureId}" since it didn't register any.`
          );
        }

        for (const [privilegeId, privilegeOverride] of Object.entries(
          featureOverride.subFeatures.privileges
        )) {
          const targetPrivilege = knownPrivileges.get(privilegeId);
          if (!targetPrivilege) {
            throw new Error(
              `Cannot override sub-feature privilege "${privilegeId}" of feature "${featureId}" since "${privilegeId}" sub-feature privilege is not registered. Known sub-feature privileges are: ${Array.from(
                knownPrivileges.keys()
              )}.`
            );
          }

          targetPrivilege.disabled = privilegeOverride.disabled;
          if (privilegeOverride.includeIn) {
            targetPrivilege.includeIn = privilegeOverride.includeIn;
          }
        }
      }
    }
  }

  /**
   * Once all features are registered and the registry is locked, this method should validate the integrity of the registered feature set, including any potential cross-feature dependencies.
   */
  public validateFeatures() {
    if (!this.locked) {
      throw new Error(
        'Cannot validate features while the registry is not locked and still allows further feature registrations.'
      );
    }

    for (const feature of Object.values(this.kibanaFeatures)) {
      if (!feature.privileges) {
        continue;
      }

      // Iterate over all top-level and sub-feature privileges.
      const isFeatureDeprecated = !!feature.deprecated;
      const replacementFeatureIds = new Set();
      for (const [privilegeId, privilege] of [
        ...Object.entries(feature.privileges),
        ...collectSubFeaturesPrivileges(feature),
      ]) {
        if (isFeatureDeprecated && !privilege.replacedBy) {
          throw new Error(
            `Feature "${feature.id}" is deprecated and must define a "replacedBy" property for privilege "${privilegeId}".`
          );
        }

        if (!isFeatureDeprecated && privilege.replacedBy) {
          throw new Error(
            `Feature "${feature.id}" is not deprecated and must not define a "replacedBy" property for privilege "${privilegeId}".`
          );
        }

        const replacedByReferences = privilege.replacedBy
          ? 'default' in privilege.replacedBy
            ? [...privilege.replacedBy.default, ...privilege.replacedBy.minimal]
            : privilege.replacedBy
          : [];
        for (const featureReference of replacedByReferences) {
          const referencedFeature = this.kibanaFeatures[featureReference.feature];
          if (!referencedFeature) {
            throw new Error(
              `Cannot replace privilege "${privilegeId}" of deprecated feature "${feature.id}" with privileges of feature "${featureReference.feature}" since such feature is not registered.`
            );
          }

          if (referencedFeature.deprecated) {
            throw new Error(
              `Cannot replace privilege "${privilegeId}" of deprecated feature "${feature.id}" with privileges of feature "${featureReference.feature}" since the referenced feature is deprecated.`
            );
          }

          // Collect all known feature and sub-feature privileges for the referenced feature.
          const knownPrivileges = new Map(
            collectPrivileges(referencedFeature).concat(
              collectSubFeaturesPrivileges(referencedFeature)
            )
          );

          for (const privilegeReference of featureReference.privileges) {
            const referencedPrivilege = knownPrivileges.get(privilegeReference);
            if (!referencedPrivilege) {
              throw new Error(
                `Cannot replace privilege "${privilegeId}" of deprecated feature "${feature.id}" with privilege "${privilegeReference}" of feature "${featureReference.feature}" since such privilege is not registered.`
              );
            }

            // Enabled privileges cannot be replaced with disabled ones.
            if (referencedPrivilege.disabled && !privilege.disabled) {
              throw new Error(
                `Cannot replace privilege "${privilegeId}" of deprecated feature "${feature.id}" with disabled privilege "${privilegeReference}" of feature "${featureReference.feature}".`
              );
            }
          }

          replacementFeatureIds.add(featureReference.feature);
        }
      }

      const featureReplacedBy = feature.deprecated?.replacedBy;
      if (featureReplacedBy) {
        if (featureReplacedBy.length === 0) {
          throw new Error(
            `Feature “${feature.id}” is deprecated and must have at least one feature ID added to the “replacedBy” property, or the property must be left out completely.`
          );
        }

        // The feature can be marked as replaced by another feature only if that feature is actually used to replace any
        // of the deprecated feature’s privileges.
        const invalidFeatureIds = featureReplacedBy.filter(
          (featureId) => !replacementFeatureIds.has(featureId)
        );
        if (invalidFeatureIds.length > 0) {
          throw new Error(
            `Cannot replace deprecated feature “${
              feature.id
            }” with the following features, as they aren’t used to replace feature privileges: ${invalidFeatureIds.join(
              ', '
            )}.`
          );
        }
      }
    }
  }

  public getAllKibanaFeatures({
    license,
    ignoreLicense = false,
    omitDeprecated = false,
  }: GetKibanaFeaturesParamsInternal = {}): KibanaFeature[] {
    if (!this.locked) {
      throw new Error('Cannot retrieve Kibana features while registration is still open');
    }

    const performLicenseCheck = license && !ignoreLicense;
    const features = [];
    for (const feature of Object.values(this.kibanaFeatures)) {
      if (omitDeprecated && feature.deprecated) {
        continue;
      }

      if (performLicenseCheck) {
        const isCompatibleLicense =
          !feature.minimumLicense || license!.hasAtLeast(feature.minimumLicense);
        if (!isCompatibleLicense) {
          continue;
        }

        feature.subFeatures?.forEach((subFeature) => {
          subFeature.privilegeGroups.forEach((group) => {
            group.privileges = group.privileges.filter(
              (privilege) =>
                !privilege.minimumLicense || license!.hasAtLeast(privilege.minimumLicense)
            );
          });
        });
      }

      features.push(new KibanaFeature(feature));
    }

    return features;
  }

  public getAllElasticsearchFeatures(): ElasticsearchFeature[] {
    if (!this.locked) {
      throw new Error('Cannot retrieve elasticsearch features while registration is still open');
    }

    return Object.values(this.esFeatures).map(
      (featureConfig) => new ElasticsearchFeature(featureConfig)
    );
  }
}

function applyAutomaticPrivilegeGrants(feature: KibanaFeatureConfig): KibanaFeatureConfig {
  const allPrivilege = feature.privileges?.all;
  const readPrivilege = feature.privileges?.read;
  const reservedPrivileges = (feature.reserved?.privileges ?? []).map((rp) => rp.privilege);

  applyAutomaticAllPrivilegeGrants(allPrivilege, ...reservedPrivileges);
  applyAutomaticReadPrivilegeGrants(readPrivilege);

  return feature;
}

function applyAutomaticAllPrivilegeGrants(
  ...allPrivileges: Array<FeatureKibanaPrivileges | undefined>
) {
  allPrivileges.forEach((allPrivilege) => {
    if (allPrivilege) {
      allPrivilege.savedObject.all = uniq([...allPrivilege.savedObject.all, 'telemetry']);
      allPrivilege.savedObject.read = uniq([
        ...allPrivilege.savedObject.read,
        'config',
        'config-global',
        'url',
        'tag',
        'cloud',
      ]);
    }
  });
}

function applyAutomaticReadPrivilegeGrants(
  ...readPrivileges: Array<FeatureKibanaPrivileges | undefined>
) {
  readPrivileges.forEach((readPrivilege) => {
    if (readPrivilege) {
      readPrivilege.savedObject.read = uniq([
        ...readPrivilege.savedObject.read,
        'config',
        'config-global',
        'telemetry',
        'url',
        'tag',
        'cloud',
      ]);
    }
  });
}

function collectPrivileges(feature: KibanaFeatureConfig) {
  return Object.entries(feature.privileges ?? {}).flatMap(
    ([id, privilege]) =>
      [
        [id, privilege],
        [`minimal_${id}`, privilege],
      ] as Array<[string, FeatureKibanaPrivileges]>
  );
}

function collectSubFeaturesPrivileges(feature: KibanaFeatureConfig) {
  return (
    feature.subFeatures?.flatMap((subFeature) =>
      subFeature.privilegeGroups.flatMap(({ privileges }) =>
        privileges.map(
          (privilege) => [privilege.id, privilege] as [string, SubFeaturePrivilegeConfig]
        )
      )
    ) ?? []
  );
}
