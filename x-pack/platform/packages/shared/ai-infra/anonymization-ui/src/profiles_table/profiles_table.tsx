/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBasicTable, type Criteria, type EuiBasicTableColumn } from '@elastic/eui';
import {
  isGlobalAnonymizationProfileTarget,
  type AnonymizationProfile,
} from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import { TARGET_TYPE_DATA_VIEW } from '../common/target_types';

interface ProfilesTableProps {
  profiles: AnonymizationProfile[];
  loading: boolean;
  total: number;
  page: number;
  perPage: number;
  isManageMode: boolean;
  dataViewTitlesById?: Record<string, string>;
  onPageChange: (page: number, size: number) => void;
  onEditProfile: (profile: AnonymizationProfile) => void;
  onDeleteProfile: (profileId: string) => void;
}

export const ProfilesTable = ({
  profiles,
  loading,
  total,
  page,
  perPage,
  isManageMode,
  dataViewTitlesById = {},
  onPageChange,
  onEditProfile,
  onDeleteProfile,
}: ProfilesTableProps) => {
  const columns = useMemo<Array<EuiBasicTableColumn<AnonymizationProfile>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('anonymizationUi.profiles.table.column.name', {
          defaultMessage: 'Name',
        }),
        dataType: 'string',
      },
      {
        field: 'targetType',
        name: i18n.translate('anonymizationUi.profiles.table.column.targetType', {
          defaultMessage: 'Target type',
        }),
      },
      {
        name: i18n.translate('anonymizationUi.profiles.table.column.targetId', {
          defaultMessage: 'Target id',
        }),
        render: (profile: AnonymizationProfile) => {
          if (profile.targetType !== TARGET_TYPE_DATA_VIEW) {
            return profile.targetId;
          }
          const dataViewTitle = dataViewTitlesById[profile.targetId];
          if (!dataViewTitle) {
            return profile.targetId;
          }
          return dataViewTitle;
        },
      },
      {
        name: i18n.translate('anonymizationUi.profiles.table.column.rules', {
          defaultMessage: 'Rules',
        }),
        render: (profile: AnonymizationProfile) => {
          const regexCount = profile.rules.regexRules?.length ?? 0;
          const nerCount = profile.rules.nerRules?.length ?? 0;
          if (isGlobalAnonymizationProfileTarget(profile.targetType, profile.targetId)) {
            return i18n.translate('anonymizationUi.profiles.table.column.rulesValueGlobal', {
              defaultMessage: '{regexCount} regex / {nerCount} ner',
              values: {
                regexCount,
                nerCount,
              },
            });
          }
          return i18n.translate('anonymizationUi.profiles.table.column.rulesValue', {
            defaultMessage: '{fieldCount} field / {regexCount} regex / {nerCount} ner',
            values: {
              fieldCount: profile.rules.fieldRules.length,
              regexCount,
              nerCount,
            },
          });
        },
      },
      {
        field: 'updatedAt',
        name: i18n.translate('anonymizationUi.profiles.table.column.updatedAt', {
          defaultMessage: 'Updated',
        }),
        render: (updatedAt: string) => new Date(updatedAt).toLocaleString(),
      },
      {
        name: i18n.translate('anonymizationUi.profiles.table.column.actions', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate('anonymizationUi.profiles.table.action.edit', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate('anonymizationUi.profiles.table.action.editDescription', {
              defaultMessage: 'Edit profile',
            }),
            type: 'icon',
            icon: 'pencil',
            enabled: () => isManageMode,
            onClick: (profile: AnonymizationProfile) => onEditProfile(profile),
            'data-test-subj': 'anonymizationProfilesEditProfile',
          },
          {
            name: i18n.translate('anonymizationUi.profiles.table.action.delete', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate('anonymizationUi.profiles.table.action.deleteDescription', {
              defaultMessage: 'Delete profile',
            }),
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            enabled: () => isManageMode,
            onClick: (profile: AnonymizationProfile) => onDeleteProfile(profile.id),
            'data-test-subj': 'anonymizationProfilesDeleteProfile',
          },
        ],
      },
    ],
    [dataViewTitlesById, isManageMode, onDeleteProfile, onEditProfile]
  );

  const onTableChange = ({ page: nextPage }: Criteria<AnonymizationProfile>) => {
    if (!nextPage) {
      return;
    }
    onPageChange(nextPage.index + 1, nextPage.size);
  };

  return (
    <EuiBasicTable<AnonymizationProfile>
      tableCaption={i18n.translate('anonymizationUi.profiles.table.caption', {
        defaultMessage: 'Anonymization profiles',
      })}
      loading={loading}
      items={profiles}
      columns={columns}
      pagination={{
        pageIndex: page - 1,
        pageSize: perPage,
        totalItemCount: total,
        pageSizeOptions: [10, 20, 50],
      }}
      onChange={onTableChange}
      noItemsMessage={i18n.translate('anonymizationUi.profiles.table.empty', {
        defaultMessage: 'No profiles found in this space.',
      })}
      data-test-subj="anonymizationProfilesTable"
    />
  );
};
