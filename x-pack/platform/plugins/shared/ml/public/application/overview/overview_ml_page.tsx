/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GetUserProfileResponse } from '@kbn/core-user-profile-browser';
import type { EuiCardProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiImage,
  EuiLink,
  EuiPageHeader,
  EuiPageBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana, useNavigateToPath } from '../contexts/kibana';
import { useCreateAndNavigateToManagementMlLink } from '../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../common/constants/locator';
import { MlPageHeader } from '../components/page_header';
import { AnomalyDetectionOverviewCard } from './components/anomaly_detection_overview';
import { DataFrameAnalyticsOverviewCard } from './components/data_frame_analytics_overview';
import { useEnabledFeatures } from '../contexts/ml';
import { DataVisualizerGrid } from './data_visualizer_grid';
import { OverviewFooterItem } from './components/overview_ml_footer_item';
import bannerImageLight from './components/welcome--light.png';
import bannerImageDark from './components/welcome--dark.png';
import { usePermissionCheck } from '../capabilities/check_capabilities';

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
  const [user, setUser] = useState<GetUserProfileResponse | undefined>();
  const {
    services: { docLinks, uiSettings, userProfile },
  } = useMlKibana();
  const { colorMode } = useEuiTheme();
  const isDarkTheme = colorMode === 'DARK';
  const { isADEnabled, isDFAEnabled, isNLPEnabled } = useEnabledFeatures();
  const [canUseAiops] = usePermissionCheck(['canUseAiops']);
  const helpLink = docLinks.links.ml.guide;
  const trainedModelsDocLink = docLinks.links.ml.trainedModels;
  const navigateToPath = useNavigateToPath();
  const navigateToTrainedModels = useCreateAndNavigateToManagementMlLink(
    '',
    ML_PAGES.TRAINED_MODELS_MANAGE
  );
  const navigateToStackManagementMLOverview = useCreateAndNavigateToManagementMlLink(
    '',
    'overview'
  );
  const isEsqlEnabled = useMemo(() => uiSettings.get(ENABLE_ESQL), [uiSettings]);

  useEffect(
    function loadUserName() {
      async function loadUser() {
        const currentUser = await userProfile.getCurrent();
        setUser(currentUser);
      }
      loadUser();
    },
    [userProfile]
  );

  return (
    <>
      <MlPageHeader>
        <EuiPageHeader
          alignItems="center"
          restrictWidth={1200}
          pageTitle={
            <EuiFlexGroup direction="column" gutterSize="s">
              {Boolean(user) ? (
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued">
                    <h4>
                      {user
                        ? i18n.translate(
                            'xpack.ml.overview.welcomeBanner.header.greeting.customTitle',
                            {
                              defaultMessage: '👋 Hi {name}!',
                              values: { name: user.user.username ?? '' },
                            }
                          )
                        : i18n.translate(
                            'xpack.ml.overview.welcomeBanner.header.greeting.defaultTitle',
                            {
                              defaultMessage: '👋 Hi',
                            }
                          )}
                    </h4>
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.ml.overview.welcomeBanner.header.title"
                      defaultMessage="Welcome to the Machine Learning Hub"
                    />
                  </h1>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText color="subdued">
                  {i18n.translate('xpack.ml.overview.welcomeBanner.header.titleDescription', {
                    defaultMessage:
                      'Analyze your data and generate models for its patterns of behavior.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          rightSideItems={[
            <EuiImage
              alt={i18n.translate('xpack.ml.overview.welcomeBanner.header.imageAlt', {
                defaultMessage: 'Welcome to the Machine Learning Hub',
              })}
              src={isDarkTheme ? bannerImageDark : bannerImageLight}
              size="l"
            />,
          ]}
        />
      </MlPageHeader>
      <EuiPageBody restrictWidth={1200}>
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
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="m">
                    {isADEnabled ? (
                      <EuiFlexItem data-test-subj="mlOverviewAnomalyDetectionCard">
                        <AnomalyDetectionOverviewCard />
                      </EuiFlexItem>
                    ) : null}
                    {isDFAEnabled ? (
                      <EuiFlexItem data-test-subj="mlOverviewCardDataFrameAnalytics">
                        <DataFrameAnalyticsOverviewCard />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="s" />
            </>
          ) : null}
          {canUseAiops ? (
            <>
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
                        <EuiButton
                          color="primary"
                          target="_self"
                          onClick={() => navigateToPath('/aiops/log_rate_analysis_index_select')}
                          data-test-subj="mlOverviewCardLogRateAnalysisButton"
                        >
                          <FormattedMessage
                            id="xpack.ml.overview.logRateAnalysis.startAnalysisButton"
                            defaultMessage="Start analysis"
                          />
                        </EuiButton>
                      }
                      data-test-subj="mlOverviewCardLogRateAnalysis"
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
                        <EuiButton
                          color="primary"
                          target="_self"
                          onClick={() => navigateToPath('/aiops/log_categorization_index_select')}
                          data-test-subj="mlOverviewCardLogPatternAnalysisButton"
                        >
                          <FormattedMessage
                            id="xpack.ml.overview.logPatternAnalysis.startAnalysisButton"
                            defaultMessage="Start analysis"
                          />
                        </EuiButton>
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
                          onClick={() =>
                            navigateToPath('/aiops/change_point_detection_index_select')
                          }
                          aria-label={i18n.translate(
                            'xpack.ml.overview.changePointDetection.title',
                            {
                              defaultMessage: 'Change Point Detection',
                            }
                          )}
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
                        <EuiButton
                          color="primary"
                          target="_self"
                          onClick={() =>
                            navigateToPath('/aiops/change_point_detection_index_select')
                          }
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
                        </EuiButton>
                      }
                      data-test-subj="mlOverviewCardChangePointDetection"
                    />
                  </EuiFlexItem>
                </EuiFlexGrid>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </>
          ) : null}
          <EuiFlexGroup direction="column">
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.ml.overview.visualizeYourDataTitle', {
                  defaultMessage: 'Visualize your data',
                })}
              </h2>
            </EuiTitle>
            <DataVisualizerGrid isEsqlEnabled={isEsqlEnabled} />
          </EuiFlexGroup>
        </EuiFlexGroup>
        <HelpMenu docLink={helpLink} />
      </EuiPageBody>
      <EuiHorizontalRule />
      <EuiFlexGroup>
        {isADEnabled || isNLPEnabled || isDFAEnabled ? (
          <EuiFlexItem>
            <OverviewFooterItem
              icon="dashboardApp"
              title={i18n.translate('xpack.ml.overview.manageMlAssetsTitle', {
                defaultMessage: 'Manage ML Assets',
              })}
              description={i18n.translate('xpack.ml.overview.manageMlAssetsDescription', {
                defaultMessage: 'Overview of your ML jobs, memory usage, and notifications.',
              })}
              docLink={helpLink}
              callToAction={
                <EuiLink onClick={navigateToStackManagementMLOverview}>
                  {i18n.translate('xpack.ml.overview.goToManagmentLink', {
                    defaultMessage: 'Go to Management',
                  })}
                </EuiLink>
              }
            />
          </EuiFlexItem>
        ) : null}
        {isNLPEnabled || isDFAEnabled ? (
          <EuiFlexItem>
            <OverviewFooterItem
              icon="machineLearningApp"
              title={i18n.translate('xpack.ml.overview.trainedModelsTitle', {
                defaultMessage: 'Trained Models',
              })}
              description={i18n.translate('xpack.ml.overview.trainedModelsDescription', {
                defaultMessage:
                  'Add or manage Trained Models. See deployment stats or add a new deployment.',
              })}
              docLink={trainedModelsDocLink}
              callToAction={
                <EuiLink onClick={navigateToTrainedModels}>
                  {i18n.translate('xpack.ml.overview.manageTrainedModelsLink', {
                    defaultMessage: 'Manage Trained Models',
                  })}
                </EuiLink>
              }
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <OverviewFooterItem
            icon="documentation"
            title={i18n.translate('xpack.ml.overview.browseDocumentationTitle', {
              defaultMessage: 'Browse documentation',
            })}
            description={i18n.translate('xpack.ml.overview.browseDocumentationDescription', {
              defaultMessage: 'In-depth guides on Elastic Machine Learning.',
            })}
            docLink={helpLink}
            callToAction={
              <EuiLink href={helpLink} external target="_blank">
                {i18n.translate('xpack.ml.overview.startReadingDocsLink', {
                  defaultMessage: 'Start Reading',
                })}
              </EuiLink>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default OverviewPage;
