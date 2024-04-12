/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { RuleManagementSubFeatureId } from '../product_features_keys';

const manageExceptionsSubFeature: SubFeatureConfig = {
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.ruleManagement.manageExceptionsSubFeatureTitle',
    {
      defaultMessage: 'Exceptions',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: [],
          id: RuleManagementSubFeatureId.manageExceptions,
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.ruleManagement.manageExceptionsSubFeatureDescription',
            {
              defaultMessage: 'Manage Exceptions and Exception lists',
            }
          ),
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      ],
    },
  ],
};

const manageValueListsSubFeature: SubFeatureConfig = {
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.ruleManagement.manageValueListsSubFeatureTitle',
    {
      defaultMessage: 'Value Lists',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: [],
          id: RuleManagementSubFeatureId.manageLists,
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.ruleManagement.manageValueListsSubFeatureDescription',
            {
              defaultMessage: 'Manage Value Lists',
            }
          ),
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      ],
    },
  ],
};

/**
 * Sub-features that will always be available for Rule Management
 * regardless of the product type.
 */
export const getRuleManagementKibanaSubFeatureIds = (): RuleManagementSubFeatureId[] => [
  RuleManagementSubFeatureId.manageExceptions,
  RuleManagementSubFeatureId.manageLists,
];

/**
 * Defines all the Rule Management subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const ruleManagementSubFeaturesMap = Object.freeze(
  new Map<RuleManagementSubFeatureId, SubFeatureConfig>([
    [RuleManagementSubFeatureId.manageExceptions, manageExceptionsSubFeature],
    [RuleManagementSubFeatureId.manageLists, manageValueListsSubFeature],
  ])
);
