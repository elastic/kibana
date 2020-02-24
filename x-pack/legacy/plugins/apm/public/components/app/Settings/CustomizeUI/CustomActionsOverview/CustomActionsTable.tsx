/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { CustomAction } from '../../../../../../../../../plugins/apm/server/lib/settings/custom_action/custom_action_types';
import { ManagedTable } from '../../../../shared/ManagedTable';
import { TimestampTooltip } from '../../../../shared/TimestampTooltip';

interface Props {
  items: CustomAction[];
  onCustomActionSelected: (customAction: CustomAction) => void;
}

export const CustomActionsTable = ({
  items,
  onCustomActionSelected
}: Props) => {
  const columns = [
    {
      field: 'label',
      name: i18n.translate(
        'xpack.apm.settings.customizeUI.customActions.table.actionName',
        { defaultMessage: 'Action Name' }
      ),
      truncateText: true
    },
    {
      field: 'url',
      name: i18n.translate(
        'xpack.apm.settings.customizeUI.customActions.table.actionURL',
        { defaultMessage: 'Action URL' }
      ),
      truncateText: true
    },
    {
      align: 'right',
      field: '@timestamp',
      name: i18n.translate(
        'xpack.apm.settings.customizeUI.customActions.table.lastUpdated',
        { defaultMessage: 'Last updated' }
      ),
      sortable: true,
      render: (value: number) => (
        <TimestampTooltip time={value} timeUnit="minutes" />
      )
    },
    {
      name: i18n.translate(
        'xpack.apm.settings.customizeUI.customActions.table.actions',
        { defaultMessage: 'Actions' }
      ),
      actions: [
        {
          name: i18n.translate(
            'xpack.apm.settings.customizeUI.customActions.table.editButtonLabel',
            { defaultMessage: 'Edit' }
          ),
          description: i18n.translate(
            'xpack.apm.settings.customizeUI.customActions.table.editButtonDescription',
            { defaultMessage: 'Edit this custom action' }
          ),
          icon: 'pencil',
          color: 'primary',
          type: 'icon',
          onClick: (customAction: CustomAction) => {
            onCustomActionSelected(customAction);
          }
        }
      ]
    }
  ];

  return (
    <ManagedTable
      items={items}
      columns={columns}
      initialPageSize={10}
      initialSortField="occurrenceCount"
      initialSortDirection="desc"
      sortItems={false}
    />
  );
};
