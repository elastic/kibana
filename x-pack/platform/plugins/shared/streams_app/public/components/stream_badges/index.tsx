/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButton, EuiButtonIcon, EuiLink, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-common-shared';
import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import {
  isIlmLifecycle,
  isErrorLifecycle,
  isDslLifecycle,
  getDiscoverEsqlQuery,
} from '@kbn/streams-schema';
import React from 'react';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { css } from '@emotion/react';
import type { IndicesIndexMode } from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from '../../hooks/use_kibana';

import { truncateText } from '../../util/truncate_text';

const DataRetentionTooltip: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <EuiToolTip
    position="top"
    title={i18n.translate('xpack.streams.badges.lifecycle.title', {
      defaultMessage: 'Data Retention',
    })}
    content={i18n.translate('xpack.streams.badges.lifecycle.description', {
      defaultMessage: 'The data retention period or policy for this stream.',
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
          "Classic streams are based on existing data streams and don't support all Streams features like partitioning.",
      })}
      anchorProps={{
        css: css`
          display: inline-flex;
        `,
      }}
    >
      <EuiBadge
        color="hollow"
        iconType="streamsClassic"
        iconSide="left"
        tabIndex={0}
        data-test-subj="classicStreamBadge"
      >
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.unmanagedBadgeLabel', {
          defaultMessage: 'Classic',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}

export function WiredStreamBadge() {
  return (
    <EuiBadge
      color="hollow"
      iconType="streamsWired"
      iconSide="left"
      data-test-subj="wiredStreamBadge"
    >
      {i18n.translate('xpack.streams.entityDetailViewWithoutParams.managedBadgeLabel', {
        defaultMessage: 'Wired',
      })}
    </EuiBadge>
  );
}

export function QueryStreamBadge() {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiBadge color={euiTheme.colors.backgroundLightAccent}>
      {i18n.translate('xpack.streams.entityDetailViewWithoutParams.queryBadgeLabel', {
        defaultMessage: 'Query stream',
      })}
    </EuiBadge>
  );
}

export function LifecycleBadge({
  lifecycle,
  dataTestSubj,
}: {
  lifecycle: IngestStreamEffectiveLifecycle;
  dataTestSubj?: string;
}) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

  let badge: React.ReactElement;

  if (isIlmLifecycle(lifecycle)) {
    badge = (
      <EuiBadge color="hollow" iconType="clockCounter" iconSide="left" tabIndex={0}>
        <EuiLink
          data-test-subj={dataTestSubj}
          color="text"
          target="_blank"
          href={ilmLocator?.getRedirectUrl({
            page: 'policy_edit',
            policyName: lifecycle.ilm.policy,
          })}
          title={lifecycle.ilm.policy}
        >
          {i18n.translate('xpack.streams.entityDetailViewWithoutParams.ilmBadgeLabel', {
            defaultMessage: 'ILM Policy: {name}',
            values: { name: truncateText(lifecycle.ilm.policy, 25) },
          })}
        </EuiLink>
      </EuiBadge>
    );
  } else if (isErrorLifecycle(lifecycle)) {
    badge = (
      <EuiBadge color="hollow" tabIndex={0} data-test-subj={dataTestSubj}>
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.errorBadgeLabel', {
          defaultMessage: 'Error: {message}',
          values: { message: lifecycle.error.message },
        })}
      </EuiBadge>
    );
  } else if (isDslLifecycle(lifecycle)) {
    badge = (
      <EuiBadge
        color="hollow"
        iconType="clockCounter"
        iconSide="left"
        tabIndex={0}
        data-test-subj={dataTestSubj}
      >
        {lifecycle.dsl.data_retention ??
          i18n.translate('xpack.streams.entityDetailViewWithoutParams.dslIndefiniteBadgeLabel', {
            defaultMessage: 'Indefinite',
          })}
      </EuiBadge>
    );
  } else {
    badge = (
      <EuiBadge color="hollow" tabIndex={0} data-test-subj={dataTestSubj}>
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.disabledLifecycleBadgeLabel', {
          defaultMessage: 'Retention: Disabled',
        })}
      </EuiBadge>
    );
  }

  return <DataRetentionTooltip>{badge}</DataRetentionTooltip>;
}

export function DiscoverBadgeButton({
  stream,
  hasDataStream = false,
  spellOut = false,
  indexMode,
}: {
  stream: Streams.all.Definition;
  hasDataStream?: boolean;
  spellOut?: boolean;
  indexMode?: IndicesIndexMode;
}) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const esqlQuery = getDiscoverEsqlQuery({
    definition: stream,
    indexMode: Streams.ingest.all.Definition.is(stream) ? indexMode : undefined,
    includeMetadata: Streams.WiredStream.Definition.is(stream),
  });
  const useUrl = share.url.locators.useUrl;

  const discoverLink = useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: {
        query: { esql: esqlQuery || '' },
      },
    }),
    [esqlQuery]
  );

  if (!discoverLink || !hasDataStream || !esqlQuery) {
    return null;
  }

  const ariaLabel = i18n.translate(
    'xpack.streams.entityDetailViewWithoutParams.openInDiscoverBadgeLabel',
    { defaultMessage: 'Open in Discover' }
  );

  return spellOut ? (
    <EuiButton
      data-test-subj={`streamsDiscoverActionButton-${stream.name}`}
      href={discoverLink}
      size="s"
      aria-label={ariaLabel}
    >
      {i18n.translate('xpack.streams.entityDetailViewWithoutParams.openInDiscoverBadgeLabel', {
        defaultMessage: 'View in Discover',
      })}
    </EuiButton>
  ) : (
    <EuiButtonIcon
      data-test-subj={`streamsDiscoverActionButton-${stream.name}`}
      href={discoverLink}
      iconType="discoverApp"
      size="xs"
      aria-label={ariaLabel}
    />
  );
}
