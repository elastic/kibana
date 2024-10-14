/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import type { BaseKibanaFeatureConfig } from '../../types';
import { APP_ID, CASES_FEATURE_ID, CASES_FEATURE_ID_V2 } from '../../constants';
import type { CasesFeatureParams } from '../types';

/**
 * @deprecated Use getCasesBaseKibanaFeatureV2 instead
 */
export const getCasesBaseKibanaFeature = ({
  uiCapabilities,
  apiTags,
  savedObjects,
}: CasesFeatureParams): BaseKibanaFeatureConfig => {
  return {
    deprecated: {
      // TODO: Add docLinks to link to documentation about the deprecation
      notice: i18n.translate(
        'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionCase.deprecationMessage',
        {
          defaultMessage:
            'The {currentId} permissions are deprecated, please see {casesFeatureIdV2}.',
          values: {
            currentId: CASES_FEATURE_ID,
            casesFeatureIdV2: CASES_FEATURE_ID_V2,
          },
        }
      ),
    },
    id: CASES_FEATURE_ID,
    name: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionCaseTitleDeprecated',
      {
        defaultMessage: 'Cases (Deprecated)',
      }
    ),
    order: 1100,
    category: DEFAULT_APP_CATEGORIES.security,
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    app: [CASES_FEATURE_ID, 'kibana'],
    catalogue: [APP_ID],
    cases: [APP_ID],
    privileges: {
      all: {
        api: apiTags.all,
        app: [CASES_FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        cases: {
          create: [APP_ID],
          read: [APP_ID],
          update: [APP_ID],
        },
        savedObject: {
          all: [...savedObjects.files],
          read: [...savedObjects.files],
        },
        ui: uiCapabilities.all,
        replacedBy: [{ feature: CASES_FEATURE_ID_V2, privileges: ['all'] }],
      },
      read: {
        api: apiTags.read,
        app: [CASES_FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        cases: {
          read: [APP_ID],
        },
        savedObject: {
          all: [],
          read: [...savedObjects.files],
        },
        ui: uiCapabilities.read,
        replacedBy: [{ feature: CASES_FEATURE_ID_V2, privileges: ['read'] }],
      },
    },
  };
};
