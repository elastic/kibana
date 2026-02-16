/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';

export const RunningQueriesApp: React.FC = () => {
  useBreadcrumbs();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const lastRefreshTime = React.useRef(Date.now());

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // TODO: trigger data refresh
    setTimeout(() => {
      setIsRefreshing(false);
      setSecondsAgo(Math.floor((Date.now() - lastRefreshTime.current) / 1000));
      lastRefreshTime.current = Date.now();
    }, 500);
  }, []);

  return (
    <EuiPageTemplate restrictWidth={false}>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.runningQueries.title', {
          defaultMessage: 'Running queries',
        })}
        description={
          <FormattedMessage
            id="xpack.runningQueries.subtitle"
            defaultMessage="Real-time insights and control over query performance within your cluster. {learnMore}"
            values={{
              learnMore: (
                <EuiLink href="https://elastic.co" target="_blank" external>
                  <FormattedMessage
                    id="xpack.runningQueries.subtitle.learnMoreLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        rightSideItems={[
          <EuiFlexGroup key="refresh-group" alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.runningQueries.lastUpdated', {
                  defaultMessage: 'Updated {seconds}s ago',
                  values: { seconds: secondsAgo },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="refresh" isLoading={isRefreshing} onClick={handleRefresh}>
                {i18n.translate('xpack.runningQueries.refreshButton', {
                  defaultMessage: 'Refresh',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      />
      <EuiPageTemplate.Section>
        <EuiText>
          <p>
            {i18n.translate('xpack.runningQueries.description', {
              defaultMessage: 'View and manage currently running queries.',
            })}
          </p>
        </EuiText>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
