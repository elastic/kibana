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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiOverlayMask,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { APP_GET_TRANSFORM_CLUSTER_PRIVILEGES } from '../../../../common/constants';
import { useRefreshTransformList, TransformListRow } from '../../common';
import { useGetTransforms } from '../../hooks';
import { RedirectToCreateTransform } from '../../common/navigation';
import { PrivilegesWrapper } from '../../lib/authorization';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';
import { documentationLinksService } from '../../services/documentation';

import { useRefreshInterval } from './components/transform_list/use_refresh_interval';
import { SearchSelection } from './components/search_selection';
import { TransformList } from './components/transform_list';
import { TransformStatsBar } from './components/transform_list/transforms_stats_bar';

export const TransformManagement: FC = () => {
  const [transformsLoading, setTransformsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [blockRefresh, setBlockRefresh] = useState(false);
  const [transforms, setTransforms] = useState<TransformListRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);

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
      <EuiPageBody data-test-subj="transformPageTransformList">
        <EuiPageContent>
          <EuiTitle size="l">
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={true}>
                <h1 data-test-subj="transformAppTitle">
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
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  href={documentationLinksService.getTransformsDocUrl()}
                  target="_blank"
                  iconType="help"
                  data-test-subj="documentationLink"
                >
                  <FormattedMessage
                    id="xpack.transform.transformList.transformDocsLinkText"
                    defaultMessage="Transform docs"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiTitle size="s">
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.transform.transformList.transformDescription"
                defaultMessage="Use transforms to pivot existing Elasticsearch indices into summarized or entity-centric indices."
              />
            </EuiText>
          </EuiTitle>
          <EuiPageContentBody>
            <EuiSpacer size="l" />
            <TransformStatsBar transformsList={transforms} />
            <EuiSpacer size="s" />
            <TransformList
              errorMessage={errorMessage}
              isInitialized={isInitialized}
              onCreateTransform={onOpenModal}
              transforms={transforms}
              transformsLoading={transformsLoading}
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
      {isSearchSelectionVisible && (
        <EuiOverlayMask>
          <EuiModal
            onClose={onCloseModal}
            className="transformCreateTransformSearchDialog"
            data-test-subj="transformSelectSourceModal"
          >
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
