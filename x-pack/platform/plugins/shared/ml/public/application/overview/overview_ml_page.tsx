/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
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
  useCurrentEuiBreakpoint,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana, useNavigateToPath } from '../contexts/kibana';
import { MlPageHeader } from '../components/page_header';
import { PageTitle } from '../components/page_title';
import { AnomalyDetectionEmptyState } from '../jobs/jobs_list/components/anomaly_detection_empty_state/anomaly_detection_empty_state';
import { AnalyticsEmptyPrompt } from '../data_frame_analytics/pages/analytics_management/components/empty_prompt/empty_prompt';

export const overviewPanelDefaultState = Object.freeze({
  nodes: true,
  adJobs: true,
  dfaJobs: true,
});

export const MLOverviewCard = ({
  layout = 'horizontal',
  path,
  title,
  description,
  iconType,
  buttonLabel,
  cardDataTestSubj,
  buttonDataTestSubj,
}: {
  layout?: 'horizontal' | 'vertical';
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
    <EuiFlexItem>
      <EuiCard
        data-test-subj={cardDataTestSubj}
        layout={layout}
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
        description={
          <>
            {description}
            <EuiSpacer size="s" />
            <EuiButtonEmpty
              flush="left"
              target="_self"
              onClick={() => navigateToPath(path)}
              data-test-subj={buttonDataTestSubj}
            >
              {buttonLabel}
            </EuiButtonEmpty>
          </>
        }
      />
    </EuiFlexItem>
  );
};

export const OverviewPage: FC = () => {
  const [canViewMlNodes, canCreateJob] = usePermissionCheck(['canViewMlNodes', 'canCreateJob']);

  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;

  const navigateToPath = useNavigateToPath();
  const currentBreakpoint = useCurrentEuiBreakpoint();
  const isMobile = useIsWithinBreakpoints(['xs', 's', 'm', 'l']);

  return (
    <>
      <MlPageHeader>
        <PageTitle
          title={i18n.translate('xpack.ml.overview.overviewLabel', {
            defaultMessage: 'Elastic Machine Learning',
          })}
        />
        <EuiText>
          <br />
          <p>
            {i18n.translate('xpack.ml.overview.overviewLabel', {
              defaultMessage: 'Link to management page',
            })}
          </p>
        </EuiText>
      </MlPageHeader>
      <div>
        <UpgradeWarning />
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
            <EuiFlexGrid gutterSize="m" responsive={false} columns={isMobile ? 1 : 2}>
              <EuiFlexItem>
                <AnomalyDetectionEmptyState />
              </EuiFlexItem>
              <EuiFlexItem>
                <AnalyticsEmptyPrompt />
              </EuiFlexItem>
            </EuiFlexGrid>
          </EuiFlexGroup>

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
                      <EuiSpacer size="s" />
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
                    </>
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
                      <EuiSpacer size="s" />
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
                    </>
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
                      <EuiSpacer size="s" />
                      <EuiButtonEmpty
                        flush="left"
                        target="_self"
                        onClick={() => navigateToPath('/aiops/change_point_detection_index_select')}
                        data-test-subj="mlOverviewCardChangePointDetectionButton"
                      >
                        <FormattedMessage
                          id="xpack.ml.overview.changePointDetection.startDetectionButton"
                          defaultMessage="Start detection"
                        />
                      </EuiButtonEmpty>
                    </>
                  }
                  data-test-subj="mlOverviewCardChangePointDetection"
                />
              </EuiFlexItem>
            </EuiFlexGrid>
          </EuiFlexGroup>

          <EuiFlexGroup direction="column">
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.ml.overview.visualizeYourDataTitle', {
                  defaultMessage: 'Visualize your data',
                })}
              </h3>
            </EuiTitle>
            <EuiFlexGrid gutterSize="m" columns={3}>
              <EuiFlexItem>
                <EuiCard
                  layout="horizontal"
                  hasBorder
                  icon={
                    <EuiButtonIcon
                      display="base"
                      size="s"
                      iconType="addDataApp"
                      onClick={() => navigateToPath('/filedatavisualizer')}
                    />
                  }
                  title={
                    <FormattedMessage
                      id="xpack.ml.datavisualizer.selector.importDataTitle"
                      defaultMessage="Visualize data from a file"
                    />
                  }
                  description={
                    <>
                      <FormattedMessage
                        id="xpack.ml.datavisualizer.selector.importDataDescription"
                        defaultMessage="Upload your file, analyze its data, and optionally import the data into an index."
                      />
                      <EuiSpacer size="s" />
                      <EuiButtonEmpty
                        flush="left"
                        target="_self"
                        onClick={() => navigateToPath('/filedatavisualizer')}
                        data-test-subj="mlDataVisualizerUploadFileButton"
                      >
                        <FormattedMessage
                          id="xpack.ml.datavisualizer.selector.uploadFileButtonLabel"
                          defaultMessage="Select file"
                        />
                      </EuiButtonEmpty>
                    </>
                  }
                  data-test-subj="mlDataVisualizerCardImportData"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCard
                  layout="horizontal"
                  hasBorder
                  icon={
                    <EuiButtonIcon
                      display="base"
                      size="s"
                      onClick={() => navigateToPath('/datavisualizer_index_select')}
                      iconType="dataVisualizer"
                      aria-label={i18n.translate(
                        'xpack.ml.datavisualizer.selector.selectDataViewTitle',
                        {
                          defaultMessage: 'Visualize data from a data view',
                        }
                      )}
                    />
                  }
                  title={
                    <FormattedMessage
                      id="xpack.ml.datavisualizer.selector.selectDataViewTitle"
                      defaultMessage="Visualize data from a data view"
                    />
                  }
                  description={
                    <>
                      <FormattedMessage
                        id="xpack.ml.datavisualizer.selector.selectDataViewTitle"
                        defaultMessage="Analyze data and its shape"
                      />
                      <EuiSpacer size="s" />
                      <EuiButtonEmpty
                        flush="left"
                        target="_self"
                        onClick={() => navigateToPath('/datavisualizer_index_select')}
                        data-test-subj="mlDataVisualizerSelectIndexButton"
                      >
                        <FormattedMessage
                          id="xpack.ml.datavisualizer.selector.selectDataViewButtonLabel"
                          defaultMessage="Select data view"
                        />
                      </EuiButtonEmpty>
                    </>
                  }
                  data-test-subj="mlDataVisualizerCardIndexData"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCard
                  layout="horizontal"
                  hasBorder
                  icon={
                    <EuiButtonIcon
                      display="base"
                      size="s"
                      iconType="visTagCloud"
                      onClick={() => navigateToPath('/data_drift_index_select')}
                    />
                  }
                  title={
                    <>
                      <FormattedMessage
                        id="xpack.ml.datavisualizer.selector.selectDataDriftTitle"
                        defaultMessage="Data drift"
                      />
                      <EuiBetaBadge
                        label=""
                        iconType="beaker"
                        size="s"
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
                  description={
                    <>
                      <FormattedMessage
                        id="xpack.ml.datavisualizer.selector.dataDriftDescription"
                        defaultMessage="Detecting data drifts enables you to identify potential performance issues."
                      />
                      <EuiSpacer size="s" />
                      <EuiButtonEmpty
                        flush="left"
                        target="_self"
                        onClick={() => navigateToPath('/data_drift_index_select')}
                        data-test-subj="mlDataVisualizerSelectDataDriftButton"
                      >
                        <FormattedMessage
                          id="xpack.ml.datavisualizer.selector.selectDataViewButtonLabel"
                          defaultMessage="Compare data distribution"
                        />
                      </EuiButtonEmpty>
                    </>
                  }
                  data-test-subj="mlDataVisualizerCardDataDriftData"
                />
              </EuiFlexItem>
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
