/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { NavigationMenu } from '../../../components/navigation_menu/navigation_menu';
import { useRefreshAnalyticsList } from '../../common';
import { CreateAnalyticsButton } from './components/create_analytics_button';
import { DataFrameAnalyticsList } from './components/analytics_list';
import { RefreshAnalyticsListButton } from './components/refresh_analytics_list_button';

export const Page: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshAnalyticsList({ isLoading: setIsLoading });

  return (
    <Fragment>
      <NavigationMenu tabId="data_frame_analytics" />
      <EuiPage data-test-subj="mlPageDataFrameAnalytics">
        <EuiPageBody>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.dataframe.analyticsList.title"
                    defaultMessage="Analytics jobs"
                  />
                  <span>&nbsp;</span>
                  <EuiBetaBadge
                    label={i18n.translate(
                      'xpack.ml.dataframe.analyticsList.experimentalBadgeLabel',
                      {
                        defaultMessage: 'Experimental',
                      }
                    )}
                    tooltipContent={i18n.translate(
                      'xpack.ml.dataframe.analyticsList.experimentalBadgeTooltipContent',
                      {
                        defaultMessage: `Data frame analytics are an experimental feature. We'd love to hear your feedback.`,
                      }
                    )}
                  />
                </h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  {<RefreshAnalyticsListButton onClick={refresh} isLoading={isLoading} />}
                </EuiFlexItem>
                <EuiFlexItem>
                  <CreateAnalyticsButton />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiSpacer size="l" />
            <EuiPanel>
              <DataFrameAnalyticsList />
            </EuiPanel>
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
