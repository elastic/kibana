/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid } from '@elastic/eui';
import { MLOverviewCard } from './overview_ml_page';
import { ML_PAGES } from '../../locator';

export const DataVisualizerGrid: FC<{ isEsqlEnabled: boolean; cardTitleSize?: 's' | 'xs' }> = ({
  isEsqlEnabled,
  cardTitleSize,
}) => (
  <EuiFlexGrid gutterSize="m" columns={2}>
    {isEsqlEnabled ? (
      <MLOverviewCard
        layout="horizontal"
        iconType="esqlVis"
        path={ML_PAGES.DATA_VISUALIZER_ESQL}
        title={
          <FormattedMessage
            id="xpack.ml.datavisualizer.selector.selectESQLTitle"
            defaultMessage="ES|QL"
          />
        }
        titleSize={cardTitleSize}
        description={i18n.translate(
          'xpack.ml.datavisualizer.selector.technicalPreviewBadge.contentMsg',
          {
            defaultMessage:
              "Use Elastic's piped query language to analyze the shape of data in an Elasticsearch index.",
          }
        )}
        buttonLabel={i18n.translate('xpack.ml.datavisualizer.selector.tryESQLNowButtonLabel', {
          defaultMessage: 'Open ES|QL editor',
        })}
        cardDataTestSubj="mlDataVisualizerSelectESQLCard"
        buttonDataTestSubj="mlDataVisualizerSelectESQLButton"
      />
    ) : null}
    <MLOverviewCard
      layout="horizontal"
      iconType="visTagCloud"
      path="/data_drift_index_select"
      title={
        <FormattedMessage
          id="xpack.ml.datavisualizer.selector.selectDataDriftTitle"
          defaultMessage="Data drift"
        />
      }
      titleSize={cardTitleSize}
      description={i18n.translate('xpack.ml.datavisualizer.selector.dataDriftDescription', {
        defaultMessage:
          'Detecting data drifts enables you to identify potential performance issues.',
      })}
      buttonLabel={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewButtonLabel', {
        defaultMessage: 'Compare data distribution',
      })}
      cardDataTestSubj="mlDataVisualizerCardDataDriftData"
      buttonDataTestSubj="mlDataVisualizerSelectDataDriftButton"
    />
    <MLOverviewCard
      iconType="export"
      layout="horizontal"
      path="/filedatavisualizer"
      title={i18n.translate('xpack.ml.datavisualizer.selector.importDataTitle', {
        defaultMessage: 'Upload data files',
      })}
      titleSize={cardTitleSize}
      description={i18n.translate('xpack.ml.datavisualizer.selector.importDataDescription', {
        defaultMessage: 'Import and analyze data from files.',
      })}
      buttonLabel={i18n.translate('xpack.ml.datavisualizer.selector.uploadFileButtonLabel', {
        defaultMessage: 'Upload data files',
      })}
      cardDataTestSubj="mlDataVisualizerCardImportData"
      buttonDataTestSubj="mlDataVisualizerUploadFileButton"
    />
    <MLOverviewCard
      iconType="tableDensityCompact"
      layout="horizontal"
      path="/datavisualizer_index_select"
      title={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewTitle', {
        defaultMessage: 'Data view',
      })}
      titleSize={cardTitleSize}
      description={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewTitle', {
        defaultMessage: 'Analyze data, its shape, and statistical metadata from a data view.',
      })}
      buttonLabel={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewButtonLabel', {
        defaultMessage: 'Select data view',
      })}
      cardDataTestSubj="mlDataVisualizerCardIndexData"
      buttonDataTestSubj="mlDataVisualizerSelectIndexButton"
    />
  </EuiFlexGrid>
);
