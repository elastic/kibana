/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { EuiPageTemplate, EuiSkeletonText, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  usePageUrlState,
  UrlStateProvider,
  type ListingPageUrlState,
  type PageUrlState,
} from '@kbn/ml-url-state';

import type { TransformListRow } from '../../common';
import type { TransformFunction } from '../../../../common/constants';
import { isTransformStats } from '../../../../common/types/transform_stats';
import { useGetTransformsStats } from '../../hooks/use_get_transform_stats';
import { useEnabledFeatures } from '../../serverless_context';
import { needsReauthorization } from '../../common/reauthorization_utils';
import { TRANSFORM_LIST_COLUMN } from '../../common';

import {
  useDocumentationLinks,
  useTransformCapabilities,
  useGetTransforms,
  useGetTransformNodes,
} from '../../hooks';
import { CapabilitiesWrapper } from '../../components/capabilities_wrapper';
import { ToastNotificationText } from '../../components/toast_notification_text';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';
import { SECTION_SLUG } from '../../common/constants';

import { TransformList } from './components/transform_list';
import { getCreateTransformPrimaryActionItem } from './components/create_transform_button';
import { TransformStatsBar } from './components/transform_list/transforms_stats_bar';
import {
  AlertRulesManageContext,
  getAlertRuleManageContext,
  TransformAlertFlyoutWrapper,
} from '../../../alerting/transform_alerting_flyout';
import { DanglingTasksWarning } from './components/dangling_task_warning/dangling_task_warning';

const getDefaultTransformListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: TRANSFORM_LIST_COLUMN.ID,
  sortDirection: 'asc',
  showPerPageOptions: true,
});

const ErrorMessageCallout: FC<{
  text: JSX.Element;
  errorMessage: IHttpFetchError<unknown> | null;
}> = ({ text, errorMessage }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <KbnDangerCallout
        size="s"
        title={
          <>
            {text}{' '}
            {errorMessage !== null && (
              <ToastNotificationText inline={true} forceModal={true} text={errorMessage} />
            )}
          </>
        }
      />
    </>
  );
};

export const TransformManagement: FC = () => {
  const { esTransform } = useDocumentationLinks();
  const { showNodeInfo } = useEnabledFeatures();
  const history = useHistory();
  const [transformPageState, setTransformPageState] = usePageUrlState<PageUrlState>(
    'transform',
    getDefaultTransformListState()
  );

  const {
    isInitialLoading: transformNodesInitialLoading,
    error: transformNodesErrorMessage,
    data: transformNodesData = 0,
  } = useGetTransformNodes({ enabled: true });
  const transformNodes = transformNodesErrorMessage === null ? transformNodesData : 0;

  const {
    isInitialLoading: transformsInitialLoading,
    isLoading: transformsWithoutStatsLoading,
    error: transformsErrorMessage,
    data: { transforms: transformsWithoutStats, transformIdsWithoutConfig },
  } = useGetTransforms({
    enabled: !transformNodesInitialLoading && transformNodes > 0,
  });

  const {
    isLoading: transformsStatsLoading,
    error: transformsStatsErrorMessage,
    data: transformsStats,
  } = useGetTransformsStats({
    basic: true,
    enabled: !transformNodesInitialLoading && transformNodes > 0,
  });

  const transforms: TransformListRow[] = useMemo(() => {
    if (!transformsStats) return transformsWithoutStats;

    return transformsWithoutStats.map((t) => {
      const stats = transformsStats.transforms.find((d) => t.config.id === d.id);

      // A newly created transform might not have corresponding stats yet.
      // If that's the case we just skip the transform and don't add it to the transform list yet.
      if (!isTransformStats(stats)) {
        return t;
      }

      return { ...t, stats };
    });
  }, [transformsStats, transformsWithoutStats]);

  const isInitialLoading = transformNodesInitialLoading || transformsInitialLoading;

  const capabilities = useTransformCapabilities();
  const { canStartStopTransform } = capabilities;

  const unauthorizedTransformsWarning = useMemo(() => {
    const unauthorizedCnt = transforms.filter((t) => needsReauthorization(t)).length;

    if (!unauthorizedCnt) return null;

    const insufficientPermissionsMsg = i18n.translate(
      'xpack.transform.transformList.unauthorizedTransformsCallout.insufficientPermissionsMsg',
      {
        defaultMessage:
          '{unauthorizedCnt, plural, one {A transform was created with insufficient permissions.} other {# transforms were created with insufficient permissions.}}',
        values: { unauthorizedCnt },
      }
    );
    const actionMsg = canStartStopTransform
      ? i18n.translate(
          'xpack.transform.transformList.unauthorizedTransformsCallout.reauthorizeMsg',
          {
            defaultMessage:
              'Reauthorize to start {unauthorizedCnt, plural, one {transform} other {# transforms}}.',
            values: { unauthorizedCnt },
          }
        )
      : i18n.translate(
          'xpack.transform.transformList.unauthorizedTransformsCallout.contactAdminMsg',
          {
            defaultMessage: 'Contact your administrator to request the required permissions.',
          }
        );
    return (
      <>
        <KbnWarningCallout
          data-test-subj="transformPageReauthorizeCallout"
          title={`${insufficientPermissionsMsg} ${actionMsg}`}
        />
        <EuiSpacer size="s" />
      </>
    );
  }, [transforms, canStartStopTransform]);

  const onCreateTransform = useCallback(
    (transformFunction: TransformFunction) => {
      history.push(`/${SECTION_SLUG.CREATE_TRANSFORM}?transformFunction=${transformFunction}`);
    },
    [history]
  );

  const showCreateInHeader = !isInitialLoading && transforms.length > 0;
  const menu: AppHeaderMenu | undefined = showCreateInHeader
    ? {
        primaryActionItem: getCreateTransformPrimaryActionItem({
          onClick: onCreateTransform,
          transformNodes,
          capabilities,
        }),
      }
    : undefined;

  return (
    <>
      <AppHeader
        title={i18n.translate('xpack.transform.transformList.transformTitle', {
          defaultMessage: 'Transforms',
        })}
        description={i18n.translate('xpack.transform.transformList.transformDescription', {
          defaultMessage:
            'Use transforms to pivot existing Elasticsearch indices into summarized entity-centric indices or to create an indexed view of the latest documents for fast access.',
        })}
        docLink={esTransform}
        menu={menu}
        spacing="bleed"
      />

      <EuiSpacer size="l" />

      <EuiPageTemplate.Section paddingSize={'none'} data-test-subj="transformPageTransformList">
        {isInitialLoading && <EuiSkeletonText lines={2} />}
        {!isInitialLoading && (
          <>
            {unauthorizedTransformsWarning}

            {showNodeInfo && transformNodesErrorMessage !== null && (
              <ErrorMessageCallout
                text={
                  <FormattedMessage
                    id="xpack.transform.list.transformNodesErrorPromptTitle"
                    defaultMessage="An error occurred getting the number of transform nodes."
                  />
                }
                errorMessage={transformNodesErrorMessage}
              />
            )}
            {transformsErrorMessage !== null && (
              <ErrorMessageCallout
                text={
                  <FormattedMessage
                    id="xpack.transform.list.transformListErrorPromptTitle"
                    defaultMessage="An error occurred getting the transform list."
                  />
                }
                errorMessage={transformsErrorMessage}
              />
            )}
            {transformsStatsErrorMessage !== null ? (
              <ErrorMessageCallout
                text={
                  <FormattedMessage
                    id="xpack.transform.list.transformStatsErrorPromptTitle"
                    defaultMessage="An error occurred getting the transform stats."
                  />
                }
                errorMessage={transformsStatsErrorMessage}
              />
            ) : null}
            <EuiSpacer size="s" />

            <TransformStatsBar transformNodes={transformNodes} transformsList={transforms} />
            <EuiSpacer size="s" />

            <AlertRulesManageContext.Provider value={getAlertRuleManageContext()}>
              <DanglingTasksWarning transformIdsWithoutConfig={transformIdsWithoutConfig} />
              {(transformNodes > 0 || transforms.length > 0) && (
                <TransformList
                  isLoading={transformsWithoutStatsLoading}
                  onCreateTransform={onCreateTransform}
                  transformNodes={transformNodes}
                  transforms={transforms}
                  transformsLoading={transformsWithoutStatsLoading}
                  transformsStatsLoading={transformsStatsLoading}
                  pageState={transformPageState as ListingPageUrlState}
                  updatePageState={setTransformPageState}
                />
              )}
              <TransformAlertFlyoutWrapper />
            </AlertRulesManageContext.Provider>
          </>
        )}
      </EuiPageTemplate.Section>
    </>
  );
};

export const TransformManagementSection: FC = () => {
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.HOME);
    docTitleService.setTitle('home');
  }, []);

  return (
    <CapabilitiesWrapper requiredCapabilities={'canGetTransform'}>
      <UrlStateProvider>
        <TransformManagement />
      </UrlStateProvider>
    </CapabilitiesWrapper>
  );
};
