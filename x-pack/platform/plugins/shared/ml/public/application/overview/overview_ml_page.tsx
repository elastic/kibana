/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiCardProps } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana, useNavigateToPath } from '../contexts/kibana';
import { MlPageHeader } from '../components/page_header';
import { PageTitle } from '../components/page_title';
import { AnomalyDetectionOverviewCard } from './components/anomaly_detection_overview';
import { DataFrameAnalyticsOverviewCard } from './components/data_frame_analytics_overview';
import { useEnabledFeatures } from '../contexts/ml';
export const overviewPanelDefaultState = Object.freeze({
  nodes: true,
  adJobs: true,
  dfaJobs: true,
});

export const MLOverviewCard = ({
  layout,
  path,
  title,
  description,
  iconType,
  buttonLabel,
  cardDataTestSubj,
  buttonDataTestSubj,
}: {
  layout?: EuiCardProps['layout'];
  path: string;
  title: string;
  description: string;
  iconType: string;
  buttonLabel: string;
  cardDataTestSubj: string;
  buttonDataTestSubj: string;
}) => {
  const navigateToPath = useNavigateToPath();

  return (
    <EuiFlexItem data-test-subj={cardDataTestSubj}>
      <EuiCard
        layout={layout}
        data-test-subj={cardDataTestSubj}
        hasBorder
        icon={
          <EuiButtonIcon
            display="base"
            size="s"
            iconType={iconType}
            onClick={() => navigateToPath(path)}
          />
        }
        title={title}
      >
        <EuiFlexItem grow={true}>
          <EuiSpacer size="m" />
          <EuiText size="s">{description}</EuiText>
        </EuiFlexItem>
        <EuiButtonEmpty
          flush="left"
          target="_self"
          onClick={() => navigateToPath(path)}
          data-test-subj={buttonDataTestSubj}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </EuiButtonEmpty>
      </EuiCard>
    </EuiFlexItem>
  );
};

export const OverviewPage: FC = () => {
  const {
    services: { docLinks, capabilities },
  } = useMlKibana();
  const { isADEnabled, isDFAEnabled } = useEnabledFeatures();
  const helpLink = docLinks.links.ml.guide;
  const navigateToPath = useNavigateToPath();

  return (
    <>
      <MlPageHeader>
        <PageTitle
          title={i18n.translate('xpack.ml.overview.overviewLabel', {
            defaultMessage: 'Elastic Machine Learning',
          })}
        />
      </MlPageHeader>
      <div>
        <UpgradeWarning />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>
                  {i18n.translate('xpack.ml.overview.analyzeYourDataTitle', {
                    defaultMessage: 'Analyze your data',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexGroup gutterSize="m" responsive={true} wrap={true}>
              {isADEnabled ? (
                <EuiFlexItem>
                  <AnomalyDetectionOverviewCard />
                </EuiFlexItem>
              ) : null}
              {isDFAEnabled ? (
                <EuiFlexItem>
                  <DataFrameAnalyticsOverviewCard />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiFlexGroup direction="column">
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.ml.overview.aiopsLabsTitle', {
                  defaultMessage: 'AIOps Labs',
                })}
              </h3>
            </EuiTitle>
            <EuiFlexGrid gutterSize="m" columns={3}>
              <EuiFlexItem>
                <EuiCard
                  textAlign="left"
                  layout="vertical"
                  hasBorder
                  icon={
                    <EuiButtonIcon
                      display="base"
                      size="s"
                      onClick={() => navigateToPath('/aiops/log_rate_analysis_index_select')}
                      iconType="logRateAnalysis"
                      aria-label={i18n.translate('xpack.ml.overview.logRateAnalysis.title', {
                        defaultMessage: 'Log Rate Analysis',
                      })}
                    />
                  }
                  title={
                    <FormattedMessage
                      id="xpack.ml.overview.logRateAnalysis.title"
                      defaultMessage="Log Rate Analysis"
                    />
                  }
                  description={
                    <>
                      <FormattedMessage
                        id="xpack.ml.overview.logRateAnalysis.description"
                        defaultMessage="Advanced statistical methods to identify reasons for increases or decreases in log rates and displays the statistically significant data in a tabular format."
                      />
                    </>
                  }
                  footer={
                    <EuiButtonEmpty
                      flush="left"
                      target="_self"
                      onClick={() => navigateToPath('/aiops/log_rate_analysis_index_select')}
                      data-test-subj="mlOverviewCardLogRateAnalysisButton"
                    >
                      <FormattedMessage
                        id="xpack.ml.overview.logRateAnalysis.startAnalysisButton"
                        defaultMessage="Start analysis"
                      />
                    </EuiButtonEmpty>
                  }
                  data-test-subj="mlDataVisualizerCardIndexData"
                />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiCard
                  textAlign="left"
                  layout="vertical"
                  hasBorder
                  icon={
                    <EuiButtonIcon
                      display="base"
                      size="s"
                      iconType="logPatternAnalysis"
                      onClick={() => navigateToPath('/aiops/log_categorization_index_select')}
                      aria-label={i18n.translate('xpack.ml.overview.logPatternAnalysisTitle', {
                        defaultMessage: 'Log Pattern Analysis',
                      })}
                    />
                  }
                  title={
                    <FormattedMessage
                      id="xpack.ml.overview.logPatternAnalysisTitle"
                      defaultMessage="Log Pattern Analysis"
                    />
                  }
                  description={
                    <>
                      <FormattedMessage
                        id="xpack.ml.overview.logPatternAnalysisDescription"
                        defaultMessage="Find patterns in unstructured log messages and make it easier to examine your data."
                      />
                    </>
                  }
                  footer={
                    <EuiButtonEmpty
                      flush="left"
                      target="_self"
                      onClick={() => navigateToPath('/aiops/log_categorization_index_select')}
                      data-test-subj="mlOverviewCardLogPatternAnalysisButton"
                    >
                      <FormattedMessage
                        id="xpack.ml.overview.logPatternAnalysis.startAnalysisButton"
                        defaultMessage="Start analysis"
                      />
                    </EuiButtonEmpty>
                  }
                  data-test-subj="mlOverviewCardLogPatternAnalysis"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCard
                  textAlign="left"
                  layout="vertical"
                  hasBorder
                  icon={
                    <EuiButtonIcon
                      display="base"
                      size="s"
                      iconType="changePointDetection"
                      onClick={() => navigateToPath('/aiops/change_point_detection_index_select')}
                      aria-label={i18n.translate('xpack.ml.overview.changePointDetection.title', {
                        defaultMessage: 'Change Point Detection',
                      })}
                    />
                  }
                  title={
                    <FormattedMessage
                      id="xpack.ml.overview.changePointDetection.title"
                      defaultMessage="Change Point Detection"
                    />
                  }
                  description={
                    <>
                      <FormattedMessage
                        id="xpack.ml.overview.changePointDetection.description"
                        defaultMessage="Change point detection uses the change point aggregation to detect distribution changes, trend changes, and other statistically significant change points in a metric of your time series data."
                      />
                    </>
                  }
                  footer={
                    <EuiButtonEmpty
                      flush="left"
                      target="_self"
                      onClick={() => navigateToPath('/aiops/change_point_detection_index_select')}
                      data-test-subj="mlOverviewCardChangePointDetectionButton"
                      aria-label={i18n.translate(
                        'xpack.ml.overview.changePointDetection.startDetectionButton',
                        {
                          defaultMessage: 'Start detection',
                        }
                      )}
                    >
                      <FormattedMessage
                        id="xpack.ml.overview.changePointDetection.startDetectionButton"
                        defaultMessage="Start detection"
                      />
                    </EuiButtonEmpty>
                  }
                  data-test-subj="mlOverviewCardChangePointDetection"
                />
              </EuiFlexItem>
            </EuiFlexGrid>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column">
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.ml.overview.visualizeYourDataTitle', {
                  defaultMessage: 'Visualize your data',
                })}
              </h3>
            </EuiTitle>
            <EuiFlexGrid gutterSize="m" columns={3}>
              <MLOverviewCard
                layout="horizontal"
                path="/filedatavisualizer"
                title={i18n.translate('xpack.ml.datavisualizer.selector.importDataTitle', {
                  defaultMessage: 'Visualize data from a file',
                })}
                description={i18n.translate(
                  'xpack.ml.datavisualizer.selector.importDataDescription',
                  {
                    defaultMessage:
                      'Upload your file, analyze its data, and optionally import the data into an index.',
                  }
                )}
                iconType="addDataApp"
                buttonLabel={i18n.translate(
                  'xpack.ml.datavisualizer.selector.uploadFileButtonLabel',
                  {
                    defaultMessage: 'Select file',
                  }
                )}
                cardDataTestSubj="mlDataVisualizerCardImportData"
                buttonDataTestSubj="mlDataVisualizerUploadFileButton"
              />
              <MLOverviewCard
                layout="horizontal"
                path="/datavisualizer_index_select"
                title={i18n.translate('xpack.ml.datavisualizer.selector.selectDataViewTitle', {
                  defaultMessage: 'Visualize data from a data view',
                })}
                description={i18n.translate(
                  'xpack.ml.datavisualizer.selector.selectDataViewTitle',
                  {
                    defaultMessage: 'Analyze data and its shape from a data view',
                  }
                )}
                iconType="dataVisualizer"
                buttonLabel={i18n.translate(
                  'xpack.ml.datavisualizer.selector.selectDataViewButtonLabel',
                  {
                    defaultMessage: 'Select data view',
                  }
                )}
                cardDataTestSubj="mlDataVisualizerCardIndexData"
                buttonDataTestSubj="mlDataVisualizerSelectIndexButton"
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
                description={i18n.translate(
                  'xpack.ml.datavisualizer.selector.dataDriftDescription',
                  {
                    defaultMessage:
                      'Detecting data drifts enables you to identify potential performance issues.',
                  }
                )}
                iconType="visTagCloud"
                buttonLabel={i18n.translate(
                  'xpack.ml.datavisualizer.selector.selectDataViewButtonLabel',
                  {
                    defaultMessage: 'Compare data distribution',
                  }
                )}
                cardDataTestSubj="mlDataVisualizerCardDataDriftData"
                buttonDataTestSubj="mlDataVisualizerSelectDataDriftButton"
              />
            </EuiFlexGrid>
          </EuiFlexGroup>
        </EuiFlexGroup>
        <HelpMenu docLink={helpLink} />
      </div>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default OverviewPage;
