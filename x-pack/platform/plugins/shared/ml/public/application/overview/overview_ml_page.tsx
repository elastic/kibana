/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiCardProps } from '@elastic/eui';
import {
  EuiButton,
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
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana, useNavigateToPath } from '../contexts/kibana';
import { MlPageHeader } from '../components/page_header';
import { PageTitle } from '../components/page_title';
import { AnomalyDetectionOverviewCard } from './components/anomaly_detection_overview';
import { DataFrameAnalyticsOverviewCard } from './components/data_frame_analytics_overview';
import { useEnabledFeatures } from '../contexts/ml';
import { DataVisualizerGrid } from './data_visualizer_grid';
import { ESQLTryItNowCard } from '../datavisualizer/datavisualizer_selector';

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
  buttonType = 'empty',
}: {
  path: string;
  iconType: string;
  buttonLabel: string;
  cardDataTestSubj: string;
  buttonDataTestSubj: string;
  buttonType: string | undefined;
} & EuiCardProps) => {
  const navigateToPath = useNavigateToPath();
  const ButtonComponent = buttonType === 'empty' ? EuiButtonEmpty : EuiButton;

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
            aria-labelledby="mlOverviewCardTitle"
          />
        }
        title={title}
        titleSize="s"
        titleElement="h3"
        id="mlOverviewCardTitle"
      >
        <EuiFlexItem grow={true}>
          <EuiSpacer size="m" />
          <EuiText size="s">{description}</EuiText>
        </EuiFlexItem>
        <EuiSpacer size="m" />
        <ButtonComponent
          flush="left"
          target="_self"
          onClick={() => navigateToPath(path)}
          data-test-subj={buttonDataTestSubj}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </ButtonComponent>
      </EuiCard>
    </EuiFlexItem>
  );
};

export const OverviewPage: FC = () => {
  const {
    services: { docLinks, uiSettings },
  } = useMlKibana();
  const { isADEnabled, isDFAEnabled } = useEnabledFeatures();
  const helpLink = docLinks.links.ml.guide;
  const navigateToPath = useNavigateToPath();
  const isEsqlEnabled = useMemo(() => uiSettings.get(ENABLE_ESQL), [uiSettings]);

  return (
    <>
      <MlPageHeader>
        <PageTitle
          title={i18n.translate('xpack.ml.overview.elasticMachineLearningLabel', {
            defaultMessage: 'Elastic Machine Learning',
          })}
        />
      </MlPageHeader>
      <div>
        <UpgradeWarning />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m" direction="column">
          {isADEnabled || isDFAEnabled ? (
            <>
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>
                      {i18n.translate('xpack.ml.overview.analyzeYourDataTitle', {
                        defaultMessage: 'Analyze your data',
                      })}
                    </h2>
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
            </>
          ) : null}
          <EuiFlexGroup direction="column">
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.ml.overview.aiopsLabsTitle', {
                  defaultMessage: 'AIOps Labs',
                })}
              </h2>
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
                  titleElement="h3"
                  titleSize="s"
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
                  titleElement="h3"
                  titleSize="s"
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
                  titleElement="h3"
                  titleSize="s"
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
              <h2>
                {i18n.translate('xpack.ml.overview.visualizeYourDataTitle', {
                  defaultMessage: 'Visualize your data',
                })}
              </h2>
            </EuiTitle>
            <EuiFlexGroup direction="column">
              {isEsqlEnabled ? <ESQLTryItNowCard /> : null}
              <EuiFlexItem>
                <DataVisualizerGrid buttonType="full" />
              </EuiFlexItem>
            </EuiFlexGroup>
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
