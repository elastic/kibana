/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { KibanaFeatureConfig, SubFeatureConfig } from '@kbn/features-plugin/common';
import type { SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common/sub_feature';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

import {
  FEATURE_ID_V4,
  GET_CONNECTORS_CONFIGURE_API_TAG,
  CASES_CONNECTORS_CAPABILITY,
  OWNERS,
} from '../../common/constants';
import { createUICapabilities, getApiTags } from '../../common';
import {
  CASES_DELETE_SUB_PRIVILEGE_ID,
  CASES_SETTINGS_SUB_PRIVILEGE_ID,
  CASES_CREATE_COMMENT_SUB_PRIVILEGE_ID,
  CASES_REOPEN_SUB_PRIVILEGE_ID,
  CASES_ASSIGN_SUB_PRIVILEGE_ID,
  CASES_MANAGE_TEMPLATES_SUB_PRIVILEGE_ID,
  CASES_CONNECTORS_SUB_PRIVILEGE_ID,
} from './constants';

const FEATURE_ORDER = 1150;

const withoutConnectors = <T extends string>(values: readonly T[]): T[] =>
  values.filter(
    (value) => value !== GET_CONNECTORS_CONFIGURE_API_TAG && value !== CASES_CONNECTORS_CAPABILITY
  );

/**
 * The single Cases feature. The space is its only access boundary, so every privilege grants its
 * operations for every owner, including each owner's file kinds.
 */
export const getV4 = ({
  disabledSubFeaturePrivileges = [],
}: { disabledSubFeaturePrivileges?: readonly string[] } = {}): KibanaFeatureConfig => {
  const capabilities = createUICapabilities();
  const owners = [...OWNERS];
  const apiTags = owners.map((owner) => getApiTags(owner));
  const subFeature = (name: string, privilege: SubFeaturePrivilegeConfig): SubFeatureConfig => ({
    name,
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          disabledSubFeaturePrivileges.includes(privilege.id)
            ? { ...privilege, disabled: true, includeIn: 'none' }
            : privilege,
        ],
      },
    ],
  });
  const unionTags = (pick: (tags: ReturnType<typeof getApiTags>) => readonly string[]) => [
    ...new Set(apiTags.flatMap(pick)),
  ];

  return {
    id: FEATURE_ID_V4,
    name: i18n.translate('xpack.cases.features.casesFeatureName', {
      defaultMessage: 'Cases',
    }),
    category: DEFAULT_APP_CATEGORIES.kibana,
    // Not listed in `app`: legacy roles inherit only the UI actions of casesV4 through
    // `replacedBy`, not `app:cases`, so the app gates itself on UI capabilities instead.
    app: [],
    order: FEATURE_ORDER,
    management: {
      insightsAndAlerting: ['cases'],
    },
    cases: owners,
    privileges: {
      all: {
        api: withoutConnectors(unionTags((tags) => tags.all)),
        cases: {
          create: owners,
          read: owners,
          update: owners,
          push: owners,
        },
        management: {
          insightsAndAlerting: ['cases'],
        },
        savedObject: {
          all: [...filesSavedObjectTypes],
          read: [...filesSavedObjectTypes],
        },
        ui: withoutConnectors(capabilities.all),
      },
      read: {
        api: withoutConnectors(unionTags((tags) => tags.read)),
        cases: {
          read: owners,
        },
        management: {
          insightsAndAlerting: ['cases'],
        },
        savedObject: {
          all: [],
          read: [...filesSavedObjectTypes],
        },
        ui: withoutConnectors(capabilities.read),
      },
    },
    subFeatures: [
      subFeature(
        i18n.translate('xpack.cases.features.deleteSubFeatureName', { defaultMessage: 'Delete' }),
        {
          api: unionTags((tags) => tags.delete),
          id: CASES_DELETE_SUB_PRIVILEGE_ID,
          name: i18n.translate('xpack.cases.features.deleteSubFeatureDetails', {
            defaultMessage: 'Delete cases and comments',
          }),
          includeIn: 'all',
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          cases: { delete: owners },
          ui: capabilities.delete,
        }
      ),
      subFeature(
        i18n.translate('xpack.cases.features.casesSettingsSubFeatureName', {
          defaultMessage: 'Case settings',
        }),
        {
          id: CASES_SETTINGS_SUB_PRIVILEGE_ID,
          name: i18n.translate('xpack.cases.features.casesSettingsSubFeatureDetails', {
            defaultMessage: 'Edit case settings',
          }),
          includeIn: 'all',
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          cases: { settings: owners },
          ui: capabilities.settings,
        }
      ),
      subFeature(
        i18n.translate('xpack.cases.features.addCommentsSubFeatureName', {
          defaultMessage: 'Create comments & attachments',
        }),
        {
          api: unionTags((tags) => tags.createComment),
          id: CASES_CREATE_COMMENT_SUB_PRIVILEGE_ID,
          name: i18n.translate('xpack.cases.features.addCommentsSubFeatureDetails', {
            defaultMessage: 'Add comments to cases',
          }),
          includeIn: 'all',
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          cases: { createComment: owners },
          ui: capabilities.createComment,
        }
      ),
      subFeature(
        i18n.translate('xpack.cases.features.reopenCaseSubFeatureName', {
          defaultMessage: 'Re-open',
        }),
        {
          id: CASES_REOPEN_SUB_PRIVILEGE_ID,
          name: i18n.translate('xpack.cases.features.reopenCaseSubFeatureDetails', {
            defaultMessage: 'Re-open closed cases',
          }),
          includeIn: 'all',
          savedObject: { all: [], read: [] },
          cases: { reopenCase: owners },
          ui: capabilities.reopenCase,
        }
      ),
      subFeature(
        i18n.translate('xpack.cases.features.assignUsersSubFeatureName', {
          defaultMessage: 'Assign users',
        }),
        {
          id: CASES_ASSIGN_SUB_PRIVILEGE_ID,
          name: i18n.translate('xpack.cases.features.assignUsersSubFeatureDetails', {
            defaultMessage: 'Assign users to cases',
          }),
          includeIn: 'all',
          savedObject: { all: [], read: [] },
          cases: { assign: owners },
          ui: capabilities.assignCase,
        }
      ),
      subFeature(
        i18n.translate('xpack.cases.features.manageTemplatesSubFeatureName', {
          defaultMessage: 'Manage templates',
        }),
        {
          id: CASES_MANAGE_TEMPLATES_SUB_PRIVILEGE_ID,
          name: i18n.translate('xpack.cases.features.manageTemplatesSubFeatureDetails', {
            defaultMessage: 'Manage case templates',
          }),
          includeIn: 'all',
          savedObject: { all: [], read: [] },
          cases: { manageTemplates: owners },
          ui: capabilities.manageTemplates,
        }
      ),
      subFeature(
        i18n.translate('xpack.cases.features.connectorsSubFeatureName', {
          defaultMessage: 'Connectors',
        }),
        {
          api: [GET_CONNECTORS_CONFIGURE_API_TAG],
          id: CASES_CONNECTORS_SUB_PRIVILEGE_ID,
          name: i18n.translate('xpack.cases.features.connectorsSubFeatureDetails', {
            defaultMessage: 'View the connectors cases can push to',
          }),
          // Tiers that lack connectors disable it with `xpack.cases.topLevelApp.disabledSubFeaturePrivileges`.
          includeIn: 'read',
          savedObject: { all: [], read: [] },
          ui: [CASES_CONNECTORS_CAPABILITY],
        }
      ),
    ],
  };
};
