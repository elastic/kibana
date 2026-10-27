/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type ReactNode } from 'react';

import { EuiLink, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { useEnabledFeatures } from '../../../../serverless_context';
import { TRANSFORM_MODE, TRANSFORM_STATE } from '../../../../../../common/constants';

import type { TransformListRow } from '../../../../common';

import { useDocumentationLinks, useRefreshTransformList } from '../../../../hooks';

import { StatsBar } from '../stats_bar';

interface TransformStatsBarProps {
  pageIndex: number;
  pageSize: number;
  transformNodes: number;
  transformsList: TransformListRow[];
}

export const TransformStatsBar: FC<TransformStatsBarProps> = ({
  pageIndex,
  pageSize,
  transformNodes,
  transformsList,
}) => {
  const { showNodeInfo } = useEnabledFeatures();
  const refreshTransformList = useRefreshTransformList();
  const { esNodeRoles } = useDocumentationLinks();

  const oneTimeCount = transformsList.filter(({ mode }) => mode === TRANSFORM_MODE.BATCH).length;
  const continuousCount = transformsList.filter(
    ({ mode }) => mode === TRANSFORM_MODE.CONTINUOUS
  ).length;
  const startedCount = transformsList.filter(
    ({ stats }) => stats?.state === TRANSFORM_STATE.STARTED
  ).length;
  const firstItem = transformsList.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastItem = Math.min((pageIndex + 1) * pageSize, transformsList.length);
  const stats: Array<{ key: string; content: ReactNode }> = [
    {
      key: 'showing',
      content: i18n.translate('xpack.transform.statsBar.showingTransformsLabel', {
        defaultMessage:
          'Showing {firstItem}–{lastItem} of {totalCount} {totalCount, plural, one {transform} other {transforms}}',
        values: {
          firstItem,
          lastItem,
          totalCount: transformsList.length,
        },
      }),
    },
    {
      key: 'oneTime',
      content: i18n.translate('xpack.transform.statsBar.oneTimeTransformsLabel', {
        defaultMessage: '{count} one-time',
        values: { count: oneTimeCount },
      }),
    },
    {
      key: 'continuous',
      content: i18n.translate('xpack.transform.statsBar.continuousTransformsLabel', {
        defaultMessage: '{count} continuous',
        values: { count: continuousCount },
      }),
    },
    {
      key: 'started',
      content: i18n.translate('xpack.transform.statsBar.startedTransformsLabel', {
        defaultMessage: '{count} started',
        values: { count: startedCount },
      }),
    },
  ];

  if (showNodeInfo) {
    stats.push({
      key: 'nodes',
      content: i18n.translate('xpack.transform.statsBar.transformNodesLabel', {
        defaultMessage: '{count} {count, plural, one {node} other {nodes}}',
        values: { count: transformNodes },
      }),
    });
  }

  return (
    <>
      {showNodeInfo && transformNodes === 0 && (
        <>
          <KbnWarningCallout
            announceOnMount
            title={
              <FormattedMessage
                id="xpack.transform.transformNodes.noTransformNodesCallOutTitle"
                defaultMessage="There are no transform nodes available."
              />
            }
            text={
              <p>
                <FormattedMessage
                  id="xpack.transform.transformNodes.noTransformNodesCallOutBody"
                  defaultMessage="You will not be able to create or run transforms. {learnMoreLink}"
                  values={{
                    learnMoreLink: (
                      <EuiLink href={esNodeRoles} target="_blank">
                        <FormattedMessage
                          id="xpack.transform.transformNodes.noTransformNodesLearnMoreLinkText"
                          defaultMessage="Learn more"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            }
            actionProps={{
              primary: {
                onClick: () => refreshTransformList(),
                children: (
                  <FormattedMessage
                    id="xpack.transform.transformNodes.noTransformNodesRetryButtonText"
                    defaultMessage="Retry"
                  />
                ),
              },
            }}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <StatsBar stats={stats} dataTestSub="transformStatsBar" />
    </>
  );
};
