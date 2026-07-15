/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import type { DataSetWithName, DataSource } from '../common';
import { CreateDatasetFlyout } from './create_dataset_flyout';
import { DatasetsTable, type DataSetListRow } from './datasets_table';

export type DataSetFlyoutState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; dataSet: DataSetWithName };

export type DatasetsTabContentProps = Parameters<typeof DatasetsTable>[0];

export const DatasetsTabContent: FunctionComponent<DatasetsTabContentProps> = (props) => {
  return <DatasetsTable {...props} />;
};

export interface DatasetsTabFlyoutProps {
  flyout: DataSetFlyoutState;
  existingDataSetNames: string[];
  dataSources: DataSource[];
  onClose: () => void;
  onSave: (dataSet: DataSetWithName, previousId?: string) => Promise<string | null>;
}

export const DatasetsTabFlyout: FunctionComponent<DatasetsTabFlyoutProps> = ({
  flyout,
  existingDataSetNames,
  dataSources,
  onClose,
  onSave,
}) => {
  if (flyout.kind === 'closed') {
    return null;
  }

  return (
    <CreateDatasetFlyout
      key={flyout.kind === 'edit' ? flyout.dataSet.name : 'create'}
      initialDataSet={flyout.kind === 'edit' ? flyout.dataSet : undefined}
      existingDataSetNames={existingDataSetNames}
      dataSources={dataSources}
      onClose={onClose}
      onSave={onSave}
    />
  );
};

export type { DataSetListRow };
