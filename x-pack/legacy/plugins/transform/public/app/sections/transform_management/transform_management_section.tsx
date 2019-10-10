/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { APP_GET_TRANSFORM_CLUSTER_PRIVILEGES } from '../../../../common/constants';
import { useRefreshTransformList, TransformListRow } from '../../common';
import { useGetTransforms } from '../../hooks';
import { RedirectToCreateTransform } from '../../common/navigation';
import { PrivilegesWrapper } from '../../lib/authorization';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';

import { useRefreshInterval } from './components/transform_list/use_refresh_interval';
import { CreateTransformButton } from './components/create_transform_button';
import { RefreshTransformListButton } from './components/refresh_transform_list_button';
import { SearchSelection } from './components/search_selection';
import { TransformList } from './components/transform_list';
import { TransformStatsBar } from './components/transform_list/transforms_stats_bar';

export const TransformManagement: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [transformsLoading, setTransformsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [blockRefresh, setBlockRefresh] = useState(false);
  const [transforms, setTransforms] = useState<TransformListRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const { refresh } = useRefreshTransformList({ isLoading: setIsLoading });

  const getTransforms = useGetTransforms(
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

  const [isSearchSelectionVisible, setIsSearchSelectionVisible] = useState(false);
  const [savedObjectId, setSavedObjectId] = useState<string | null>(null);

  if (savedObjectId !== null) {
    return <RedirectToCreateTransform savedObjectId={savedObjectId} />;
  }

  const onCloseModal = () => setIsSearchSelectionVisible(false);
  const onOpenModal = () => setIsSearchSelectionVisible(true);
  const onSearchSelected = (id: string, type: string) => {
    setSavedObjectId(id);
  };

  return (
    <Fragment>
      <EuiPage data-test-subj="transformPageTransform">
        <EuiPageBody>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.transform.transformList.transformTitle"
                    defaultMessage="Transforms"
                  />
                  <span>&nbsp;</span>
                  <EuiBetaBadge
                    label={i18n.translate('xpack.transform.transformList.betaBadgeLabel', {
                      defaultMessage: `Beta`,
                    })}
                    tooltipContent={i18n.translate(
                      'xpack.transform.transformList.betaBadgeTooltipContent',
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
                  <CreateTransformButton onClick={onOpenModal} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiSpacer size="l" />
            <TransformStatsBar transformsList={transforms} />
            <EuiSpacer size="s" />
            <EuiPanel>
              <TransformList
                errorMessage={errorMessage}
                isInitialized={isInitialized}
                onCreateTransform={onOpenModal}
                transforms={transforms}
                transformsLoading={transformsLoading}
              />
            </EuiPanel>
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
      {isSearchSelectionVisible && (
        <EuiOverlayMask>
          <EuiModal onClose={onCloseModal} className="transformCreateTransformSearchDialog">
            <SearchSelection onSearchSelected={onSearchSelected} />
          </EuiModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};

export const TransformManagementSection: FC = () => {
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.HOME);
    docTitleService.setTitle('home');
  }, []);

  return (
    <PrivilegesWrapper privileges={APP_GET_TRANSFORM_CLUSTER_PRIVILEGES}>
      <TransformManagement />
    </PrivilegesWrapper>
  );
};
