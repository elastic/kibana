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
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { useRunningQueriesAppContext } from '../app_context';
import type { RunningQuery } from '../../../common/types';

interface QueryDetailFlyoutProps {
  query: RunningQuery;
  onClose: () => void;
  onStopQuery: (taskId: string) => void;
}

function formatRuntime(startTime: number): string {
  const duration = moment.duration(Date.now() - startTime);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();

  if (hours > 0) {
    return minutes > 0
      ? i18n.translate('xpack.runningQueries.flyout.runtimeHoursMinutes', {
          defaultMessage:
            '{hours} {hours, plural, one {hour} other {hours}} {minutes} {minutes, plural, one {min} other {mins}}',
          values: { hours, minutes },
        })
      : i18n.translate('xpack.runningQueries.flyout.runtimeHours', {
          defaultMessage: '{hours} {hours, plural, one {hour} other {hours}}',
          values: { hours },
        });
  }

  return i18n.translate('xpack.runningQueries.flyout.runtimeMinutes', {
    defaultMessage: '{minutes} {minutes, plural, one {min} other {mins}}',
    values: { minutes },
  });
}

export const QueryDetailFlyout: React.FC<QueryDetailFlyoutProps> = ({
  query,
  onClose,
  onStopQuery,
}) => {
  const { url } = useRunningQueriesAppContext();

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
    <EuiFlyout onClose={onClose} size="m" maxWidth={691}>
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
            <EuiBadge color="hollow">
              {query.queryType === 'ES|QL' ? 'ESQL' : query.queryType}
            </EuiBadge>
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
          <EuiLink>{query.source}</EuiLink>
        </EuiText>

        {query.remoteSearch && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.runningQueries.flyout.remoteSearchLabel', {
                  defaultMessage: 'Remote search',
                })}
              </strong>{' '}
              {query.remoteSearch}
            </EuiText>
          </>
        )}

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
              <EuiText size="s">
                <strong>{moment(query.startTime).format('MMM D YYYY, HH:mm:ss')}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.runningQueries.flyout.runtimeLabel', {
                  defaultMessage: 'Runtime',
                })}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                <strong>{formatRuntime(query.startTime)}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.runningQueries.flyout.indicesLabel', {
                  defaultMessage: 'Indices',
                })}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                <strong>{query.indices}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.runningQueries.flyout.queryLabel', {
              defaultMessage: 'Query',
            })}
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiCodeBlock
          language={query.queryType === 'ES|QL' ? 'esql' : 'json'}
          lineNumbers
          overflowHeight={300}
          isCopyable
          isVirtualized
        >
          {query.query}
        </EuiCodeBlock>
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
            <EuiButton
              color="danger"
              fill
              onClick={() => onStopQuery(query.taskId)}
              isDisabled={!query.cancellable || query.cancelled}
            >
              {i18n.translate('xpack.runningQueries.flyout.stopQueryButton', {
                defaultMessage: 'Stop query',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
