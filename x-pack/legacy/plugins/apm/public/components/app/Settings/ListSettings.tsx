/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiIcon } from '@elastic/eui';
import { loadCMList } from '../../../services/rest/apm/settings';
import { useFetcher } from '../../../hooks/useFetcher';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
import { CMListAPIResponse } from '../../../../server/lib/settings/cm/list_configurations';
import { AddSettingsFlyout } from './AddSettings/AddSettingFlyout';
import { DeleteModal } from './DeleteModal';

type Config = CMListAPIResponse[0];

export function ListSettings() {
  const { data = [], refresh } = useFetcher(loadCMList, []);
  const [configToBeDeleted, setConfigToBeDeleted] = useState<Config | null>(
    null
  );
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const COLUMNS: Array<ITableColumn<Config>> = [
    {
      field: 'service.name',
      name: i18n.translate('xpack.apm.settingsTable.serviceN  ameColumnLabel', {
        defaultMessage: 'Service name'
      }),
      width: '50%',
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'service.environment',
      name: i18n.translate('xpack.apm.settingsTable.environmentColumnLabel', {
        defaultMessage: 'Service environment'
      }),
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'settings.sample_rate',
      name: i18n.translate('xpack.apm.settingsTable.sampelRateColumnLabel', {
        defaultMessage: 'Sample rate'
      }),
      sortable: true,
      render: (value: string) => value
    },
    {
      name: 'Delete',
      actions: [
        {
          name: 'Delete',
          description: 'Delete this config',
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: (config: Config) => {
            setConfigToBeDeleted(config);
          }
        }
      ]
    }
  ];

  return (
    <>
      <DeleteModal
        configToBeDeleted={configToBeDeleted}
        onCancel={() => {
          setConfigToBeDeleted(null);
        }}
        onConfirm={() => {
          setConfigToBeDeleted(null);
          refresh();
        }}
      />
      <AddSettingsFlyout
        isOpen={isFlyoutOpen}
        onClose={() => setIsFlyoutOpen(false)}
        onSubmit={() => {
          setIsFlyoutOpen(false);
          refresh();
        }}
      />
      <EuiTitle>
        <h2>Agent configuration</h2>
      </EuiTitle>
      <ManagedTable columns={COLUMNS} items={data} initialPageSize={50} />
      <a
        onClick={() => setIsFlyoutOpen(true)}
        onKeyPress={() => setIsFlyoutOpen(true)}
      >
        <EuiIcon type="plusInCircle" /> Add new configuration
      </a>
    </>
  );
}
