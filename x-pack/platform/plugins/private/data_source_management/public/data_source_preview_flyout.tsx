/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
} from '@elastic/eui';

import type { DataSetListItem } from '../common/sample_data_sets_client';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { dataSourcePreviewFlyoutStrings } from './data_source_preview_flyout_i18n';
import {
  DataSourcePreviewDescription,
  DataSourcePreviewDetails,
  DataSourcePreviewFooterActions,
  DataSourcePreviewTitleWithType,
} from './data_source_preview_shared';

export interface DataSourcePreviewFlyoutProps {
  source: DataSourceListItem;
  /** Data sets whose `sourceName` matches this source. */
  sets: DataSetListItem[];
  onClose: () => void;
  /** Invoked when the user chooses to manage data sets for this source (e.g. navigate to a management flow). */
  onManageDataSets?: () => void;
  /** Called after a data set row is deleted (refresh parent `sets` from the client). */
  onDataSetsChanged?: () => void;
}

export const DataSourcePreviewFlyout: FunctionComponent<DataSourcePreviewFlyoutProps> = ({
  source,
  sets,
  onClose,
  onManageDataSets = () => {},
  onDataSetsChanged,
}) => {
  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="dataSourcePreviewFlyoutTitle"
      size="m"
      data-test-subj="dataSourcePreviewFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <DataSourcePreviewTitleWithType
          title={source.name}
          source={source}
          titleSize="m"
          heading="h2"
          titleId="dataSourcePreviewFlyoutTitle"
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DataSourcePreviewDescription source={source} variant="flyout" />
        <EuiSpacer size="l" />
        <DataSourcePreviewDetails sets={sets} onDataSetsChanged={onDataSetsChanged} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <DataSourcePreviewFooterActions
          closeLabel={dataSourcePreviewFlyoutStrings.closeButton()}
          onClose={onClose}
          onManageDataSets={onManageDataSets}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
