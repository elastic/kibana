/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { EuiText, EuiLink, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-common-shared';
import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import {
  isDslLifecycle,
  isErrorLifecycle,
  isIlmLifecycle,
  isRoot,
  LOGS_ROOT_STREAM_NAME,
} from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import {
  ILM_POLICY_TOOLTIP_TITLE,
  INDEFINITE_RETENTION_ARIA_LABEL,
  INDEFINITE_RETENTION_LABEL,
  NO_DATA_SHORT_LABEL,
  NO_RETENTION_LABEL,
} from './translations';
import { getTimeSizeAndUnitLabel } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_size_units';

export function RetentionColumn({
  lifecycle,
  streamName,
  dataStream,
  dataTestSubj,
}: {
  lifecycle: IngestStreamEffectiveLifecycle;
  streamName?: string;
  /** Data stream stats from the list API; used to show DSL retention hint alongside ILM. */
  dataStream?: IndicesDataStream;
  dataTestSubj?: string;
}) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

  if (isErrorLifecycle(lifecycle)) {
    // For logs.ecs and logs.otel (new root streams without a data stream yet), show a dash
    if (streamName && isRoot(streamName) && streamName !== LOGS_ROOT_STREAM_NAME) {
      return <span>-</span>;
    }
    return (
      <EuiBadge
        color="hollow"
        aria-label={i18n.translate('xpack.streams.streamsRetentionColumn.errorBadgeAriaLabel', {
          defaultMessage: 'Retention policy error: {message}',
          values: { message: lifecycle.error.message },
        })}
        role="status"
        aria-live="polite"
      >
        {lifecycle.error.message}
      </EuiBadge>
    );
  }

  if (isIlmLifecycle(lifecycle)) {
    const rawDslRetention = dataStream?.lifecycle?.data_retention;
    const retentionSummary =
      rawDslRetention != null && String(rawDslRetention).trim() !== ''
        ? getTimeSizeAndUnitLabel(String(rawDslRetention)) ?? String(rawDslRetention)
        : INDEFINITE_RETENTION_LABEL;

    const policyHref = ilmLocator?.getRedirectUrl({
      page: 'policy_edit',
      policyName: lifecycle.ilm.policy,
    });
    const policyLinkLabel = i18n.translate(
      'xpack.streams.streamsRetentionColumn.ilmLinkAriaLabel',
      {
        defaultMessage: 'ILM policy "{name}", opens in Index Lifecycle Management in a new tab',
        values: { name: lifecycle.ilm.policy },
      }
    );
    const ilmUnavailableLabel = i18n.translate(
      'xpack.streams.streamsRetentionColumn.ilmUnavailableAriaLabel',
      {
        defaultMessage: 'ILM policy "{name}"',
        values: { name: lifecycle.ilm.policy },
      }
    );
    const ilmBadgeLabel = i18n.translate('xpack.streams.streamsRetentionColumn.ilmBadgeLabel', {
      defaultMessage: 'ILM',
    });

    const badge = (
      <EuiBadge color="hollow" iconType="external" iconSide="right">
        {ilmBadgeLabel}
      </EuiBadge>
    );

    const retentionText = (
      <EuiText
        size="s"
        css={{ whiteSpace: 'nowrap' as const }}
        data-test-subj={dataTestSubj ? `${dataTestSubj}-retentionSummary` : undefined}
      >
        {retentionSummary}
      </EuiText>
    );

    const policyAnchor = !policyHref ? (
      <span
        data-test-subj={dataTestSubj ? `${dataTestSubj}-ilmPolicy` : undefined}
        aria-label={ilmUnavailableLabel}
      >
        {badge}
      </span>
    ) : (
      <EuiLink
        href={policyHref}
        target="_blank"
        rel="noopener noreferrer"
        external={false}
        aria-label={policyLinkLabel}
        data-test-subj={dataTestSubj ? `${dataTestSubj}-ilmPolicy` : undefined}
        css={{
          display: 'inline-flex',
          maxWidth: '150px',
          '&:hover, &:focus': { textDecoration: 'none' },
        }}
      >
        {badge}
      </EuiLink>
    );

    const policyControl = (
      <EuiToolTip
        position="top"
        title={ILM_POLICY_TOOLTIP_TITLE}
        content={lifecycle.ilm.policy}
        css={css`
          && {
            max-width: 256px !important;
          }
        `}
        anchorProps={{
          css: css`
            display: inline-flex;
          `,
        }}
      >
        {policyAnchor}
      </EuiToolTip>
    );

    return (
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        wrap
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>{retentionText}</EuiFlexItem>
        <EuiFlexItem grow={false}>{policyControl}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isDslLifecycle(lifecycle)) {
    const retentionValue = getTimeSizeAndUnitLabel(lifecycle.dsl.data_retention);
    if (retentionValue) {
      return (
        <span
          tabIndex={0}
          aria-label={i18n.translate('xpack.streams.streamsRetentionColumn.dslRetentionAriaLabel', {
            defaultMessage: 'Data retention period: {retention}',
            values: { retention: retentionValue },
          })}
          data-test-subj={dataTestSubj}
        >
          {retentionValue}
        </span>
      );
    }

    return (
      <span tabIndex={0} aria-label={INDEFINITE_RETENTION_ARIA_LABEL} data-test-subj={dataTestSubj}>
        {INDEFINITE_RETENTION_LABEL}
      </span>
    );
  }

  return (
    <EuiText
      color="subdued"
      tabIndex={0}
      aria-label={NO_RETENTION_LABEL}
      data-test-subj={dataTestSubj}
    >
      {NO_DATA_SHORT_LABEL}
    </EuiText>
  );
}
