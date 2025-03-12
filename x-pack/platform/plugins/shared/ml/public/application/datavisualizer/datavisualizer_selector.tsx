/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useMemo } from 'react';

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiBetaBadge,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { isFullLicense } from '../license';
import { useMlKibana, useNavigateToPath } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';
import { MlPageHeader } from '../components/page_header';
import { ML_PAGES } from '../../locator';
import esqlImage from './images/esql-overview-ml.svg';
import { DataVisualizerGrid } from '../overview/data_visualizer_grid';

function startTrialDescription() {
  return (
    <span>
      <FormattedMessage
        id="xpack.ml.datavisualizer.startTrial.fullMLFeaturesDescription"
        defaultMessage="To experience the full Machine Learning features that a {subscriptionsLink} offers, start a 30-day trial."
        values={{
          subscriptionsLink: (
            <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
              <FormattedMessage
                id="xpack.ml.datavisualizer.startTrial.subscriptionsLinkText"
                defaultMessage="Platinum or Enterprise subscription"
              />
            </EuiLink>
          ),
        }}
      />
    </span>
  );
}

export const ESQLTryItNowCard: FC = () => {
  const navigateToPath = useNavigateToPath();

  return (
    <EuiFlexItem>
      <EuiPanel hasShadow={false} hasBorder data-test-subj="mlDataVisualizerSelectESQLCard">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiImage size="fullWidth" src={esqlImage} alt={'ES|QL input image'} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
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
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.selector.technicalPreviewBadge.contentMsg"
                    defaultMessage="The Elasticsearch Query Language (ES|QL) provides a powerful way to filter, transform, and analyze data stored in Elastic Search."
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButton
                    fill
                    target="_self"
                    onClick={() => navigateToPath(ML_PAGES.DATA_VISUALIZER_ESQL)}
                    data-test-subj="mlDataVisualizerSelectESQLButton"
                  >
                    <FormattedMessage
                      id="xpack.ml.datavisualizer.selector.tryESQLNowButtonLabel"
                      defaultMessage="Try it now!"
                    />
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};
export const DatavisualizerSelector: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const {
    services: {
      licenseManagement,
      http: { basePath },
      docLinks,
      dataVisualizer,
      uiSettings,
    },
  } = useMlKibana();
  const isEsqlEnabled = useMemo(() => uiSettings.get(ENABLE_ESQL), [uiSettings]);
  const helpLink = docLinks.links.ml.guide;

  const startTrialVisible =
    licenseManagement !== undefined &&
    licenseManagement.enabled === true &&
    isFullLicense() === false;

  if (dataVisualizer === undefined) {
    // eslint-disable-next-line no-console
    console.error('File data visualizer plugin not available');
    return null;
  }

  return (
    <>
      <div data-test-subj="mlPageDataVisualizerSelector">
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.datavisualizer.selector.dataVisualizerTitle"
            defaultMessage="Data Visualizer"
          />
        </MlPageHeader>

        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.ml.datavisualizer.selector.dataVisualizerDescription"
                defaultMessage="The Machine Learning Data Visualizer tool helps you understand your data
                  by analyzing the metrics and fields in a log file or an existing Elasticsearch index."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiFlexGroup direction="column">
          {isEsqlEnabled ? <ESQLTryItNowCard /> : null}
          <EuiFlexItem>
            <DataVisualizerGrid buttonType="full" />
          </EuiFlexItem>
        </EuiFlexGroup>
        {startTrialVisible === true && (
          <Fragment>
            <EuiSpacer size="xxl" />
            <EuiSpacer size="xxl" />
            <EuiFlexGrid gutterSize="xl" columns={2} style={{ maxWidth: '1000px' }}>
              <EuiFlexItem>
                <EuiCard
                  hasBorder
                  title={
                    <FormattedMessage
                      id="xpack.ml.datavisualizer.selector.startTrialTitle"
                      defaultMessage="Start trial"
                    />
                  }
                  description={startTrialDescription()}
                  footer={
                    <EuiButton
                      target="_blank"
                      href={`${basePath.get()}/app/management/stack/license_management/home`}
                      data-test-subj="mlDataVisualizerStartTrialButton"
                    >
                      <FormattedMessage
                        id="xpack.ml.datavisualizer.selector.startTrialButtonLabel"
                        defaultMessage="Start trial"
                      />
                    </EuiButton>
                  }
                  data-test-subj="mlDataVisualizerCardStartTrial"
                />
              </EuiFlexItem>
            </EuiFlexGrid>
          </Fragment>
        )}
      </div>
      <HelpMenu docLink={helpLink} />
    </>
  );
};
