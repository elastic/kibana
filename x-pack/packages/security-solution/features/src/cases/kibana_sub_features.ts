/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { CasesSubFeatureId } from '../product_features_keys';
import { APP_ID } from '../constants';
import type { CasesFeatureParams } from './types';

/**
 * Sub-features that will always be available for Security Cases
 * regardless of the product type.
 */
export const getCasesBaseKibanaSubFeatureIds = (): CasesSubFeatureId[] => [
  CasesSubFeatureId.deleteCases,
  CasesSubFeatureId.casesSettings,
  CasesSubFeatureId.createComment,
  CasesSubFeatureId.reopenCase,
];

/**
 * Defines all the Security Assistant subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getCasesSubFeaturesMap = ({
  uiCapabilities,
  apiTags,
  savedObjects,
}: CasesFeatureParams) => {
  const deleteCasesSubFeature: SubFeatureConfig = {
    name: i18n.translate('securitySolutionPackages.features.featureRegistry.deleteSubFeatureName', {
      defaultMessage: 'Delete',
    }),
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            api: apiTags.delete,
            id: 'cases_delete',
            name: i18n.translate(
              'securitySolutionPackages.features.featureRegistry.deleteSubFeatureDetails',
              {
                defaultMessage: 'Delete cases and comments',
              }
            ),
            includeIn: 'all',
            savedObject: {
              all: [...savedObjects.files],
              read: [...savedObjects.files],
            },
            cases: {
              delete: [APP_ID],
            },
            ui: uiCapabilities.delete,
          },
        ],
      },
    ],
  };

  const casesSettingsCasesSubFeature: SubFeatureConfig = {
    name: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.casesSettingsSubFeatureName',
      {
        defaultMessage: 'Case settings',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            id: 'cases_settings',
            name: i18n.translate(
              'securitySolutionPackages.features.featureRegistry.casesSettingsSubFeatureDetails',
              {
                defaultMessage: 'Edit case settings',
              }
            ),
            includeIn: 'all',
            savedObject: {
              all: [...savedObjects.files],
              read: [...savedObjects.files],
            },
            cases: {
              settings: [APP_ID],
            },
            ui: uiCapabilities.settings,
          },
        ],
      },
    ],
  };

  const casesAddCommentsCasesSubFeature: SubFeatureConfig = {
    name: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.addCommentsSubFeatureName',
      {
        defaultMessage: 'Add comments',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            api: apiTags.all,
            id: 'create_comment',
            name: i18n.translate(
              'securitySolutionPackages.features.featureRegistry.addCommentsSubFeatureDetails',
              {
                defaultMessage: 'Add comments to cases',
              }
            ),
            includeIn: 'all',
            savedObject: {
              all: [],
              read: [],
            },
            cases: {
              createComment: [APP_ID],
            },
            ui: uiCapabilities.createComment,
          },
        ],
      },
    ],
  };
  const casesreopenCaseubFeature: SubFeatureConfig = {
    name: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.reopenCaseubFeatureName',
      {
        defaultMessage: 'Re-open',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            api: apiTags.all,
            id: 'case_reopen',
            name: i18n.translate(
              'securitySolutionPackages.features.featureRegistry.reopenCaseubFeatureDetails',
              {
                defaultMessage: 'Re-open closed cases',
              }
            ),
            includeIn: 'all',
            savedObject: {
              all: [],
              read: [],
            },
            cases: {
              reopenCase: [APP_ID],
            },
            ui: uiCapabilities.reopenCase,
          },
        ],
      },
    ],
  };

  return new Map<CasesSubFeatureId, SubFeatureConfig>([
    [CasesSubFeatureId.deleteCases, deleteCasesSubFeature],
    [CasesSubFeatureId.casesSettings, casesSettingsCasesSubFeature],
    [CasesSubFeatureId.createComment, casesAddCommentsCasesSubFeature],
    [CasesSubFeatureId.reopenCase, casesreopenCaseubFeature],
  ]);
};
