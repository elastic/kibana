/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useEnabledFeatures } from '../../../../serverless_context';
import { TRANSFORM_MODE, TRANSFORM_STATE } from '../../../../../../common/constants';

import type { TransformListRow } from '../../../../common';

import { useDocumentationLinks, useRefreshTransformList } from '../../../../hooks';

import type { TransformStatsBarStats } from '../stats_bar';
import { StatsBar } from '../stats_bar';

function createTransformStats(
  transformNodes: number,
  transformsList: TransformListRow[],
  showNodeInfo: boolean
): TransformStatsBarStats {
  const transformStats: TransformStatsBarStats = {
    total: {
      label: i18n.translate('xpack.transform.statsBar.totalTransformsLabel', {
        defaultMessage: 'Total transforms',
      }),
      value: 0,
      show: true,
    },
    batch: {
      label: i18n.translate('xpack.transform.statsBar.batchTransformsLabel', {
        defaultMessage: 'Batch',
      }),
      value: 0,
      show: true,
    },
    continuous: {
      label: i18n.translate('xpack.transform.statsBar.continuousTransformsLabel', {
        defaultMessage: 'Continuous',
      }),
      value: 0,
      show: true,
    },
    failed: {
      label: i18n.translate('xpack.transform.statsBar.failedTransformsLabel', {
        defaultMessage: 'Failed',
      }),
      value: 0,
      show: false,
    },
    started: {
      label: i18n.translate('xpack.transform.statsBar.startedTransformsLabel', {
        defaultMessage: 'Started',
      }),
      value: 0,
      show: true,
    },
  };

  if (showNodeInfo) {
    transformStats.nodes = {
      label: i18n.translate('xpack.transform.statsBar.transformNodesLabel', {
        defaultMessage: 'Nodes',
      }),
      value: transformNodes,
      show: true,
    };
  }

  if (transformsList === undefined) {
    return transformStats;
  }

  let failedTransforms = 0;
  let startedTransforms = 0;

  transformsList.forEach((transform) => {
    if (
      transform.mode === TRANSFORM_MODE.CONTINUOUS &&
      typeof transformStats.continuous.value === 'number'
    ) {
      transformStats.continuous.value++;
    } else if (
      transform.mode === TRANSFORM_MODE.BATCH &&
      typeof transformStats.batch.value === 'number'
    ) {
      transformStats.batch.value++;
    }

    if (transform.stats) {
      if (transform.stats.state === TRANSFORM_STATE.FAILED) {
        failedTransforms++;
      } else if (transform.stats.state === TRANSFORM_STATE.STARTED) {
        startedTransforms++;
      }
    }
  });

  transformStats.total.value = transformsList.length;
  transformStats.started.value = startedTransforms;

  if (failedTransforms !== 0) {
    transformStats.failed.value = failedTransforms;
    transformStats.failed.show = true;
  } else {
    transformStats.failed.show = false;
  }

  return transformStats;
}

interface TransformStatsBarProps {
  transformNodes: number;
  transformsList: TransformListRow[];
}

export const TransformStatsBar: FC<TransformStatsBarProps> = ({
  transformNodes,
  transformsList,
}) => {
  const { showNodeInfo } = useEnabledFeatures();
  const refreshTransformList = useRefreshTransformList();
  const { esNodeRoles } = useDocumentationLinks();

  const transformStats: TransformStatsBarStats = createTransformStats(
    transformNodes,
    transformsList,
    showNodeInfo
  );

  return (
    <>
      {showNodeInfo && transformNodes === 0 && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.transform.transformNodes.noTransformNodesCallOutTitle"
                defaultMessage="There are no transform nodes available."
              />
            }
            color="warning"
            iconType="warning"
          >
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
            <EuiButton onClick={() => refreshTransformList()} size="s">
              <FormattedMessage
                id="xpack.transform.transformNodes.noTransformNodesRetryButtonText"
                defaultMessage="Retry"
              />
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <StatsBar stats={transformStats} dataTestSub={'transformStatsBar'} />
    </>
  );
};
