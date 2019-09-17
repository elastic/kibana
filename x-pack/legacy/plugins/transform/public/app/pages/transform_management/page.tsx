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

import { useRefreshTransformList, DataFrameTransformListRow } from '../../common';
import { CreateTransformButton } from './components/create_transform_button';
import { DataFrameTransformList } from './components/transform_list';
import { RefreshTransformListButton } from './components/refresh_transform_list_button';
import { TransformStatsBar } from '../transform_management/components/transform_list/transforms_stats_bar';
import { getTransformsFactory } from './services/transform_service';
import { useRefreshInterval } from './components/transform_list/use_refresh_interval';

export const Page: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [transformsLoading, setTransformsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [blockRefresh, setBlockRefresh] = useState(false);
  const [transforms, setTransforms] = useState<DataFrameTransformListRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const { refresh } = useRefreshTransformList({ isLoading: setIsLoading });

  const getTransforms = getTransformsFactory(
    setTransforms,
    setErrorMessage,
    setIsInitialized,
    blockRefresh
  );

  // Subscribe to the refresh observable to trigger reloading the transform list.
  useRefreshTransformList({
    isLoading: setTransformsLoading,
    onRefresh: () => getTransforms(true),
  });
  // Call useRefreshInterval() after the subscription above is set up.
  useRefreshInterval(setBlockRefresh);

  return (
    <Fragment>
      <TransformStatsBar transformsList={transforms} />
      <EuiPage data-test-subj="mlPageDataFrame">
        <EuiPageBody>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.dataframe.transformList.dataFrameTitle"
                    defaultMessage="Transforms"
                  />
                  <span>&nbsp;</span>
                  <EuiBetaBadge
                    label={i18n.translate('xpack.ml.dataframe.transformList.betaBadgeLabel', {
                      defaultMessage: `Beta`,
                    })}
                    tooltipContent={i18n.translate(
                      'xpack.ml.dataframe.transformList.betaBadgeTooltipContent',
                      {
                        defaultMessage: `Transforms are a beta feature. We'd love to hear your feedback.`,
                      }
                    )}
                  />
                </h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiFlexGroup alignItems="center">
                {/* grow={false} fixes IE11 issue with nested flex */}
                <EuiFlexItem grow={false}>
                  <RefreshTransformListButton onClick={refresh} isLoading={isLoading} />
                </EuiFlexItem>
                {/* grow={false} fixes IE11 issue with nested flex */}
                <EuiFlexItem grow={false}>
                  <CreateTransformButton />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiSpacer size="l" />
            <EuiPanel>
              <DataFrameTransformList
                transforms={transforms}
                isInitialized={isInitialized}
                errorMessage={errorMessage}
                transformsLoading={transformsLoading}
              />
            </EuiPanel>
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
