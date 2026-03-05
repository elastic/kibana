/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { formatRuntime } from '../../lib/format_runtime';
import { useRunningQueriesAppContext } from '../app_context';
import { notAvailableLabel } from './running_queries_table';
import type { RunningQuery } from '../../../common/types';

interface QueryDetailFlyoutProps {
  query: RunningQuery;
  isStopRequested: boolean;
  onClose: () => void;
  onStopQuery: (taskId: string) => void;
}

export const QueryDetailFlyout: React.FC<QueryDetailFlyoutProps> = ({
  query,
  isStopRequested,
  onClose,
  onStopQuery,
}) => {
  const { url, capabilities } = useRunningQueriesAppContext();
  const canCancelTasks = capabilities.canCancelTasks;
  const source = query.source?.trim();

  const { rangeFrom, rangeTo } = useMemo(() => {
    const from = new Date(query.startTime);
    from.setMinutes(from.getMinutes() - 10);

    return { rangeFrom: from.toISOString(), rangeTo: new Date().toISOString() };
  }, [query.startTime]);

  const discoverLocator = url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  const inspectInDiscoverLabel = i18n.translate(
    'xpack.runningQueries.flyout.inspectInDiscoverLabel',
    {
      defaultMessage: 'Inspect in Discover',
    }
  );

  const flyoutAriaLabel = i18n.translate('xpack.runningQueries.flyout.ariaLabel', {
    defaultMessage: 'Running query details',
  });

  const inspectInDiscoverLinkProps = useMemo(() => {
    if (!query.traceId) {
      return undefined;
    }

    const discoverParams: DiscoverAppLocatorParams = {
      timeRange: { from: rangeFrom, to: rangeTo },
      query: { language: 'kuery', query: `trace.id:"${query.traceId}"` },
      filters: [],
    };

    const discoverHref = discoverLocator?.getRedirectUrl(discoverParams);

    return discoverLocator && discoverHref
      ? getRouterLinkProps({
          href: discoverHref,
          onClick: () => discoverLocator.navigate(discoverParams),
        })
      : undefined;
  }, [discoverLocator, query.traceId, rangeFrom, rangeTo]);

  return (
    <EuiFlyout aria-label={flyoutAriaLabel} onClose={onClose} size="m" maxWidth={691}>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.runningQueries.flyout.taskIdLabel', {
                  defaultMessage: 'Task ID',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{query.taskId}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{query.queryType}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>

        {query.traceId && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.runningQueries.flyout.traceIdLabel', {
                      defaultMessage: 'Trace ID',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{query.traceId}</EuiText>
              </EuiFlexItem>
              {inspectInDiscoverLinkProps ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="discoverApp"
                    data-test-subj="runningQueriesFlyoutInspectInDiscoverButton"
                    aria-label={inspectInDiscoverLabel}
                    {...inspectInDiscoverLinkProps}
                  >
                    {inspectInDiscoverLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </>
        )}

        <EuiSpacer size="s" />

        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.runningQueries.flyout.sourceLabel', {
              defaultMessage: 'Source',
            })}
          </strong>{' '}
          {source ? (
            <EuiLink>{source}</EuiLink>
          ) : (
            <EuiText color="subdued">
              <em>{notAvailableLabel}</em>
            </EuiText>
          )}
        </EuiText>

        <EuiSpacer size="l" />

        <EuiPanel hasBorder paddingSize="l">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.runningQueries.flyout.startTimeLabel', {
                  defaultMessage: 'Start time',
                })}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText>
                <h4>
                  <strong>{moment(query.startTime).format('MMM D YYYY, HH:mm:ss')}</strong>
                </h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.runningQueries.flyout.runtimeLabel', {
                  defaultMessage: 'Runtime',
                })}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText>
                <h4>
                  <strong>{formatRuntime(query.startTime)}</strong>
                </h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.runningQueries.flyout.indicesLabel', {
                  defaultMessage: 'Indices',
                })}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText>
                <h4>
                  <strong>{query.indices}</strong>
                </h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        {query.query && (
          <>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.runningQueries.flyout.queryLabel', {
                  defaultMessage: 'Query',
                })}
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiCodeBlock
              css={css`
                .euiCodeBlock__pre {
                  block-size: auto;
                }
              `}
              language={
                query.queryType === 'ES|QL' ? 'esql' : query.queryType === 'SQL' ? 'sql' : 'json'
              }
              lineNumbers
              overflowHeight="100%"
              isCopyable
            >
              {query.query}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.runningQueries.flyout.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {(isStopRequested || (canCancelTasks && query.cancellable) || query.cancelled) && (
              <EuiButton
                color="danger"
                fill
                onClick={() => onStopQuery(query.taskId)}
                isDisabled={isStopRequested || query.cancelled}
                isLoading={isStopRequested}
              >
                {query.cancelled
                  ? i18n.translate('xpack.runningQueries.flyout.queryStoppedText', {
                      defaultMessage: 'Query was stopped',
                    })
                  : isStopRequested
                  ? i18n.translate('xpack.runningQueries.flyout.stoppingQueryText', {
                      defaultMessage: 'Stopping the query…',
                    })
                  : i18n.translate('xpack.runningQueries.flyout.stopQueryButton', {
                      defaultMessage: 'Stop query',
                    })}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
