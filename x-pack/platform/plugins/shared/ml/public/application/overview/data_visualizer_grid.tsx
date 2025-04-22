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
import { EuiBetaBadge, EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { MLOverviewCard } from './overview_ml_page';
import { ML_PAGES } from '../../locator';

export const DataVisualizerGrid: FC<{ buttonType?: 'empty' | 'full'; isEsqlEnabled: boolean }> = ({
  buttonType,
  isEsqlEnabled,
}) => (
  <EuiFlexGrid gutterSize="m" columns={2}>
    {isEsqlEnabled ? (
      <MLOverviewCard
        layout="horizontal"
        path={ML_PAGES.DATA_VISUALIZER_ESQL}
        title={
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.selectESQLTitle"
                    defaultMessage="ES|QL"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label=""
                iconType="beaker"
                size="m"
                color="hollow"
                tooltipContent={
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.esqlTechnicalPreviewBadge.titleMsg"
                    defaultMessage="ES|QL data visualizer is in technical preview."
                  />
                }
                tooltipPosition={'right'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={i18n.translate(
          'xpack.ml.datavisualizer.selector.technicalPreviewBadge.contentMsg',
          {
            defaultMessage:
              'The Elasticsearch Query Language (ES|QL) provides a powerful way to filter, transform, and analyze data stored in Elasticsearch.',
          }
        )}
        iconType="esqlVis"
        buttonLabel={i18n.translate('xpack.ml.datavisualizer.selector.tryESQLNowButtonLabel', {
          defaultMessage: 'Try it now!',
        })}
        cardDataTestSubj="mlDataVisualizerSelectESQLCard"
        buttonDataTestSubj="mlDataVisualizerSelectESQLButton"
        buttonType={buttonType}
      />
    ) : null}
    <MLOverviewCard
      layout="horizontal"
      path="/filedatavisualizer"
      title={i18n.translate('xpack.ml.datavisualizer.selector.importDataTitle', {
        defaultMessage: 'Visualize data from a file',
      })}
      description={i18n.translate('xpack.ml.datavisualizer.selector.importDataDescription', {
        defaultMessage:
          'Upload your file, analyze its data, and optionally import the data into an index.',
      })}
      iconType="addDataApp"
      buttonLabel={i18n.translate('xpack.ml.datavisualizer.selector.uploadFileButtonLabel', {
        defaultMessage: 'Select file',
      })}
      cardDataTestSubj="mlDataVisualizerCardImportData"
      buttonDataTestSubj="mlDataVisualizerUploadFileButton"
      buttonType={buttonType}
    />
    <MLOverviewCard
      layout="horizontal"
      path="/datavisualizer_index_select"
      title={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewTitle', {
        defaultMessage: 'Visualize data from a data view',
      })}
      description={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewTitle', {
        defaultMessage: 'Analyze data, its shape, and statistical metadata from a data view.',
      })}
      iconType="dataVisualizer"
      buttonLabel={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewButtonLabel', {
        defaultMessage: 'Select data view',
      })}
      cardDataTestSubj="mlDataVisualizerCardIndexData"
      buttonDataTestSubj="mlDataVisualizerSelectIndexButton"
      buttonType={buttonType}
    />
    <MLOverviewCard
      layout="horizontal"
      path="/data_drift_index_select"
      title={
        <>
          <FormattedMessage
            id="xpack.ml.datavisualizer.selector.selectDataDriftTitle"
            defaultMessage="Visualize data using data drift"
          />{' '}
          <EuiBetaBadge
            label=""
            iconType="beaker"
            size="m"
            color="hollow"
            tooltipContent={
              <FormattedMessage
                id="xpack.ml.datavisualizer.selector.dataDriftTechnicalPreviewBadge.titleMsg"
                defaultMessage="Data drift visualizer is in technical preview."
              />
            }
            tooltipPosition={'right'}
          />
        </>
      }
      description={i18n.translate('xpack.ml.datavisualizer.selector.dataDriftDescription', {
        defaultMessage:
          'Detecting data drifts enables you to identify potential performance issues.',
      })}
      iconType="visTagCloud"
      buttonLabel={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewButtonLabel', {
        defaultMessage: 'Compare data distribution',
      })}
      cardDataTestSubj="mlDataVisualizerCardDataDriftData"
      buttonDataTestSubj="mlDataVisualizerSelectDataDriftButton"
      buttonType={buttonType}
    />
  </EuiFlexGrid>
);
