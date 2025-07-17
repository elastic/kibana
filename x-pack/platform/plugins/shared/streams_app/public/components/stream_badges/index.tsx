/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IlmLocatorParams, ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-common-shared';
import {
  IngestStreamEffectiveLifecycle,
  isIlmLifecycle,
  isErrorLifecycle,
  isDslLifecycle,
  Streams,
} from '@kbn/streams-schema';
import React from 'react';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { css } from '@emotion/react';
import { useKibana } from '../../hooks/use_kibana';
import { getIndexPatterns } from '../../util/hierarchy_helpers';

const DataRetentionTooltip: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <EuiToolTip
    position="top"
    title={i18n.translate('xpack.streams.badges.lifecycle.title', {
      defaultMessage: 'Data Retention',
    })}
    content={i18n.translate('xpack.streams.badges.lifecycle.description', {
      defaultMessage: 'You can edit retention settings from the stream’s management view',
    })}
    anchorProps={{
      css: css`
        display: inline-flex;
      `,
    }}
  >
    {children}
  </EuiToolTip>
);

export function ClassicStreamBadge() {
  return (
    <EuiToolTip
      position="top"
      title={i18n.translate('xpack.streams.badges.classic.title', {
        defaultMessage: 'Classic Stream',
      })}
      content={i18n.translate('xpack.streams.badges.classic.description', {
        defaultMessage:
          'Classic streams are based on existing data streams and may not support all Streams features like custom re-routing',
      })}
      anchorProps={{
        css: css`
          display: inline-flex;
        `,
      }}
    >
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.unmanagedBadgeLabel', {
          defaultMessage: 'Classic',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}

export function LifecycleBadge({ lifecycle }: { lifecycle: IngestStreamEffectiveLifecycle }) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

  let badge: React.ReactElement;

  if (isIlmLifecycle(lifecycle)) {
    badge = (
      <EuiBadge color="hollow">
        <EuiLink
          data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
          color="text"
          target="_blank"
          href={ilmLocator?.getRedirectUrl({
            page: 'policy_edit',
            policyName: lifecycle.ilm.policy,
          })}
        >
          {i18n.translate('xpack.streams.entityDetailViewWithoutParams.ilmBadgeLabel', {
            defaultMessage: 'ILM Policy: {name}',
            values: { name: lifecycle.ilm.policy },
          })}
        </EuiLink>
      </EuiBadge>
    );
  } else if (isErrorLifecycle(lifecycle)) {
    badge = (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.errorBadgeLabel', {
          defaultMessage: 'Error: {message}',
          values: { message: lifecycle.error.message },
        })}
      </EuiBadge>
    );
  } else if (isDslLifecycle(lifecycle)) {
    badge = (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.dslBadgeLabel', {
          defaultMessage: 'Retention: {retention}',
          values: { retention: lifecycle.dsl.data_retention || '∞' },
        })}
      </EuiBadge>
    );
  } else {
    badge = (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.disabledLifecycleBadgeLabel', {
          defaultMessage: 'Retention: Disabled',
        })}
      </EuiBadge>
    );
  }

  return <DataRetentionTooltip>{badge}</DataRetentionTooltip>;
}

export function DiscoverBadgeButton({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const dataStreamExists =
    Streams.WiredStream.GetResponse.is(definition) || definition.data_stream_exists;
  const indexPatterns = getIndexPatterns(definition.stream);
  const esqlQuery = indexPatterns ? `FROM ${indexPatterns.join(', ')}` : undefined;

  if (!discoverLocator || !dataStreamExists || !esqlQuery) {
    return null;
  }

  const discoverLink = discoverLocator.useUrl({
    query: {
      esql: esqlQuery,
    },
  });

  return (
    <EuiButtonIcon
      data-test-subj="streamsDetailOpenInDiscoverBadgeButton"
      href={discoverLink}
      iconType="discoverApp"
      size="xs"
      aria-label={i18n.translate(
        'xpack.streams.entityDetailViewWithoutParams.openInDiscoverBadgeLabel',
        { defaultMessage: 'Open in Discover' }
      )}
    />
  );
}
