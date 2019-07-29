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
import { useRefreshTransformList } from '../../common';
import { CreateTransformButton } from './components/create_transform_button';
import { DataFrameTransformList } from './components/transform_list';
import { RefreshTransformListButton } from './components/refresh_transform_list_button';

export const Page: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshTransformList({ isLoading: setIsLoading });

  return (
    <Fragment>
      <NavigationMenu tabId="data_frames" />
      <EuiPage data-test-subj="mlPageDataFrame">
        <EuiPageBody>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.dataframe.transformList.dataFrameTitle"
                    defaultMessage="Data frame transforms"
                  />
                  <span>&nbsp;</span>
                  <EuiBetaBadge
                    label={i18n.translate('xpack.ml.dataframe.transformList.betaBadgeLabel', {
                      defaultMessage: `Beta`,
                    })}
                    tooltipContent={i18n.translate(
                      'xpack.ml.dataframe.transformList.betaBadgeTooltipContent',
                      {
                        defaultMessage: `Data frames are a beta feature. We'd love to hear your feedback.`,
                      }
                    )}
                  />
                </h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <RefreshTransformListButton onClick={refresh} isLoading={isLoading} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <CreateTransformButton />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiSpacer size="l" />
            <EuiPanel>
              <DataFrameTransformList />
            </EuiPanel>
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
