/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiLiveAnnouncer,
  EuiSpacer,
  EuiText,
  useEuiOverflowScroll,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import {
  fullDatasetNameDescription,
  fullDatasetNameLabel,
  inactiveDatasetsDescription,
  inactiveDatasetsLabel,
  loadingDatasetsText,
  noDatasetsTitle,
} from '../../../../common/translations';
import { useDatasetQualityTable } from '../../../hooks';
import { DescriptiveSwitch } from '../../common/descriptive_switch';

export const Table = () => {
  const {
    sort,
    onTableChange,
    pagination,
    renderedItems,
    columns,
    loading,
    resultsCount,
    showInactiveDatasets,
    showFullDatasetNames,
    canUserMonitorAnyDataset,
    canUserMonitorAnyDataStream,
    toggleInactiveDatasets,
    toggleFullDatasetNames,
  } = useDatasetQualityTable();

  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const overflowXScrollStyles = useEuiOverflowScroll('x');

  useUpdateEffect(() => {
    const fullDatasetNamesState = showFullDatasetNames
      ? i18n.translate('xpack.datasetQuality.tableUpdated.fullDatasetNamesState.shown', {
          defaultMessage: 'shown',
        })
      : i18n.translate('xpack.datasetQuality.tableUpdated.fullDatasetNamesState.hidden', {
          defaultMessage: 'hidden',
        });

    const inactiveDatasetsState = showInactiveDatasets
      ? i18n.translate('xpack.datasetQuality.tableUpdated.inactiveDatasetsState.shown', {
          defaultMessage: 'shown',
        })
      : i18n.translate('xpack.datasetQuality.tableUpdated.inactiveDatasetsState.hidden', {
          defaultMessage: 'hidden',
        });

    setLiveAnnouncement(
      i18n.translate('xpack.datasetQuality.tableUpdated.combined', {
        defaultMessage:
          'Table updated. Full dataset names are {fullDatasetNamesState}. Inactive datasets are {inactiveDatasetsState}.',
        values: {
          fullDatasetNamesState,
          inactiveDatasetsState,
        },
      })
    );
  }, [showFullDatasetNames, showInactiveDatasets]);

  return (
    <>
      <EuiLiveAnnouncer>{liveAnnouncement}</EuiLiveAnnouncer>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.datasetQuality.tableSummary"
            defaultMessage="Showing {items} Datasets"
            values={{
              items: resultsCount,
            }}
          />
        </EuiText>
        <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
          <DescriptiveSwitch
            testSubject="datasetQualityFullDatasetNameSwitch"
            label={fullDatasetNameLabel}
            checked={showFullDatasetNames}
            tooltipText={fullDatasetNameDescription}
            onToggle={toggleFullDatasetNames}
          />
          {canUserMonitorAnyDataset && canUserMonitorAnyDataStream && (
            <DescriptiveSwitch
              testSubject="datasetQualityInactiveDatasetsSwitch"
              label={inactiveDatasetsLabel}
              checked={showInactiveDatasets}
              tooltipText={inactiveDatasetsDescription}
              onToggle={toggleInactiveDatasets}
            />
          )}
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" css={{ height: 2 }} />
      <EuiBasicTable
        css={css`
          ${overflowXScrollStyles};
        `}
        tableCaption={i18n.translate('xpack.datasetQuality.tableCaption', {
          defaultMessage: 'Dataset quality table',
        })}
        tableLayout="auto"
        sorting={sort}
        onChange={onTableChange}
        pagination={pagination}
        data-test-subj="datasetQualityTable"
        rowProps={{
          'data-test-subj': 'datasetQualityTableRow',
        }}
        items={renderedItems}
        columns={columns}
        loading={loading}
        noItemsMessage={
          loading ? (
            loadingDatasetsText
          ) : (
            <EuiEmptyPrompt
              data-test-subj="datasetQualityTableNoData"
              layout="vertical"
              title={<h2>{noDatasetsTitle}</h2>}
              hasBorder={false}
              titleSize="m"
            />
          )
        }
      />
    </>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default Table;
