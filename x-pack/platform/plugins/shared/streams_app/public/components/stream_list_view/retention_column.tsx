/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiLink, EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-common-shared';
import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import { isDslLifecycle, isErrorLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';
import {
  INDEFINITE_RETENTION_ARIA_LABEL,
  INDEFINITE_RETENTION_LABEL,
  NO_DATA_SHORT_LABEL,
  NO_RETENTION_LABEL,
} from './translations';
import { getTimeSizeAndUnitLabel } from '../data_management/stream_detail_lifecycle/helpers/format_size_units';

export function RetentionColumn({
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

  if (isErrorLifecycle(lifecycle)) {
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
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiLink
          href={ilmLocator?.getRedirectUrl({
            page: 'policy_edit',
            policyName: lifecycle.ilm.policy,
          })}
          target="_blank"
          aria-label={i18n.translate('xpack.streams.streamsRetentionColumn.ilmLinkAriaLabel', {
            defaultMessage: 'ILM policy: {name}, click to edit the policy in a new tab',
            values: { name: lifecycle.ilm.policy },
          })}
          css={{
            whiteSpace: 'nowrap' as const,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            maxWidth: '150px',
          }}
          data-test-subj={dataTestSubj}
        >
          {lifecycle.ilm.policy}
        </EuiLink>
        <EuiBadge color="hollow">
          <EuiText size="s">
            {i18n.translate('xpack.streams.streamsRetentionColumn.ilmBadgeLabel', {
              defaultMessage: 'ILM',
            })}
          </EuiText>
        </EuiBadge>
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
