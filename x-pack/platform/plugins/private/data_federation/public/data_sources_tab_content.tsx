/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataSourceWithSecrets, DataSource } from '../common';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { DataSourcesTable } from './data_sources_table';
import { getFlyoutSaveErrorMessage } from './get_flyout_save_error_message';
import type { DataFederationKibanaServices } from './types';

export type DataSourceFlyoutState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; dataSource: DataSourceWithSecrets };

export type DataSourcesTabContentProps = Parameters<typeof DataSourcesTable>[0];

export const DataSourcesTabContent: FunctionComponent<DataSourcesTabContentProps> = (props) => {
  return <DataSourcesTable {...props} />;
};

export const DataSourcesTabFlyout: FunctionComponent<{
  flyout: DataSourceFlyoutState;
  existingDataSourceNames: string[];
  onClose: (result?: { savedChanges?: boolean }) => void;
}> = ({ flyout, existingDataSourceNames, onClose }) => {
  const {
    services: { dataSourcesClient },
  } = useKibana<DataFederationKibanaServices>();

  const onSave = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        if (flyout.mode === 'edit') {
          await dataSourcesClient.update(dataSource);
        } else {
          await dataSourcesClient.add(dataSource);
        }

        onClose({ savedChanges: true });
        return null;
      } catch (e) {
        return getFlyoutSaveErrorMessage(e);
      }
    },
    [dataSourcesClient, flyout.mode, onClose]
  );

  if (flyout.mode === 'closed') {
    return null;
  }

  return (
    <CreateDataSourceFlyout
      initialDataSource={flyout.mode === 'edit' ? flyout.dataSource : undefined}
      existingDataSourceNames={existingDataSourceNames}
      onClose={onClose}
      onSave={onSave}
    />
  );
};

export type { DataSource };
