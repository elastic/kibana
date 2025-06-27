/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiLink, EuiBadge, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ILM_LOCATOR_ID, IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import {
  IngestStreamEffectiveLifecycle,
  isDslLifecycle,
  isErrorLifecycle,
  isIlmLifecycle,
} from '@kbn/streams-schema';
import { useKibana } from '../../hooks/use_kibana';

export function RetentionColumn({ lifecycle }: { lifecycle: IngestStreamEffectiveLifecycle }) {
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
      <EuiBadge
        color="hollow"
        tabIndex={0}
        role="region"
        aria-label={i18n.translate('xpack.streams.streamsRetentionColumn.ilmBadgeAriaLabel', {
          defaultMessage: 'ILM retention policy: {name}',
          values: { name: lifecycle.ilm.policy },
        })}
      >
        <EuiLink
          data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
          color="text"
          href={ilmLocator?.getRedirectUrl({
            page: 'policy_edit',
            policyName: lifecycle.ilm.policy,
          })}
          target="_blank"
          aria-label={i18n.translate('xpack.streams.streamsRetentionColumn.ilmLinkAriaLabel', {
            defaultMessage: 'Edit ILM policy {name} (opens in new tab)',
            values: { name: lifecycle.ilm.policy },
          })}
          aria-describedby="ilm-policy-description"
        >
          {i18n.translate('xpack.streams.streamsRetentionColumn.ilmBadgeLabel', {
            defaultMessage: 'ILM policy: {name}',
            values: {
              name: lifecycle.ilm.policy,
            },
          })}
        </EuiLink>
        <span id="ilm-policy-description" className="euiScreenReaderOnly">
          {i18n.translate('xpack.streams.streamsRetentionColumn.ilmPolicyDescription', {
            defaultMessage: 'Index Lifecycle Management policy that controls data retention',
          })}
        </span>
      </EuiBadge>
    );
  }

  if (isDslLifecycle(lifecycle)) {
    const retentionValue = lifecycle.dsl.data_retention;

    if (retentionValue) {
      return (
        <span
          tabIndex={0}
          aria-label={i18n.translate('xpack.streams.streamsRetentionColumn.dslRetentionAriaLabel', {
            defaultMessage: 'Data retention period: {retention}',
            values: { retention: retentionValue },
          })}
        >
          {retentionValue}
        </span>
      );
    }

    return (
      <EuiIcon
        type="infinity"
        size="m"
        aria-label={i18n.translate(
          'xpack.streams.streamsRetentionColumn.infiniteRetentionAriaLabel',
          {
            defaultMessage: 'Infinite retention - data is kept indefinitely',
          }
        )}
        tabIndex={0}
        role="img"
      />
    );
  }

  return (
    <EuiText
      color="subdued"
      tabIndex={0}
      aria-label={i18n.translate('xpack.streams.streamsRetentionColumn.noDataAriaLabel', {
        defaultMessage: 'No retention policy configured',
      })}
    >
      {i18n.translate('xpack.streams.streamsRetentionColumn.noDataLabel', {
        defaultMessage: 'N/A',
      })}
    </EuiText>
  );
}
