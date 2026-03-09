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
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiLink,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
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
      ? {
          href: discoverHref,
          target: '_blank',
          rel: 'noopener noreferrer',
        }
      : undefined;
  }, [discoverLocator, query.traceId, rangeFrom, rangeTo]);

  return (
    <EuiFlyout aria-label={flyoutAriaLabel} onClose={onClose} size="m" maxWidth={691}>
      <EuiFlyoutHeader hasBorder>
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
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
                  <strong>{formatRuntime(query.runningTimeMs)}</strong>
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

        <EuiDescriptionList
          type="column"
          columnWidths={[1, 7]}
          listItems={[
            ...(query.traceId
              ? [
                  {
                    title: i18n.translate('xpack.runningQueries.flyout.traceIdLabel', {
                      defaultMessage: 'Trace ID',
                    }),
                    description: inspectInDiscoverLinkProps ? (
                      <EuiLink
                        data-test-subj="runningQueriesFlyoutTraceIdLink"
                        external
                        {...inspectInDiscoverLinkProps}
                      >
                        {query.traceId}
                      </EuiLink>
                    ) : (
                      query.traceId
                    ),
                  },
                ]
              : []),
            {
              title: i18n.translate('xpack.runningQueries.flyout.sourceLabel', {
                defaultMessage: 'Source',
              }),
              description: source || <em>{notAvailableLabel}</em>,
            },
          ]}
        />

        {query.query && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="s">
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

        {query.xOpaqueId && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.runningQueries.flyout.opaqueIDLabel', {
                  defaultMessage: 'Opaque ID',
                })}
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiCodeBlock lineNumbers isCopyable>
              {query.xOpaqueId}
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
