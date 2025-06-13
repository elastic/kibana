/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiBetaBadge,
  EuiText,
  EuiLink,
  EuiPageHeader,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsTreeTable } from './tree_table';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { StreamsListEmptyState } from './streams_list_empty_state';

export function StreamListView() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        share,
      },
    },
  } = useKibana();
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const handleAddData = () => {
    onboardingLocator?.navigate({});
  };
  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );

  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiPageHeader
        paddingSize="l"
        css={css`
          background: ${euiTheme.colors.backgroundBasePlain};
          .euiSpacer--l {
            display: none !important;
          }
        `}
        pageTitle={
          <EuiFlexGroup
            alignItems="center"
            gutterSize="m"
            css={css`
              margin-bottom: ${euiTheme.size.s};
            `}
          >
            {i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
              defaultMessage: 'Streams',
            })}
            <EuiBetaBadge
              label={i18n.translate('xpack.streams.streamsListView.betaBadgeLabel', {
                defaultMessage: 'Technical Preview',
              })}
              tooltipContent={i18n.translate('xpack.streams.streamsListView.betaBadgeDescription', {
                defaultMessage:
                  'This functionality is experimental and not supported. It may change or be removed at any time.',
              })}
              alignment="middle"
              size="s"
            />
          </EuiFlexGroup>
        }
        description={
          <EuiText color="subdued" size="s">
            {i18n.translate('xpack.streams.streamsListView.pageHeaderDescription', {
              defaultMessage:
                'Use Streams to organize and process your data into clear structured flows, and simplify routing, field extraction, and retention management.',
            })}{' '}
            <EuiLink
              target="_blank"
              href="https://www.elastic.co/docs/solutions/observability/logs/streams/streams"
            >
              {i18n.translate('xpack.streams.streamsListView.pageHeaderDocsLink', {
                defaultMessage: 'See docs',
              })}
            </EuiLink>
          </EuiText>
        }
      />
      <StreamsAppPageTemplate.Body grow>
        {!streamsListFetch.loading && !streamsListFetch.value?.length ? (
          <StreamsListEmptyState onAddData={handleAddData} />
        ) : (
          <StreamsTreeTable loading={streamsListFetch.loading} streams={streamsListFetch.value} />
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
