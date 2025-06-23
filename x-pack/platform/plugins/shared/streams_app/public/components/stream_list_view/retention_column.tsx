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
    return <EuiBadge color="hollow">{lifecycle.error.message}</EuiBadge>;
  }

  if (isIlmLifecycle(lifecycle)) {
    return (
      <EuiBadge color="hollow">
        <EuiLink
          data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
          color="text"
          href={ilmLocator?.getRedirectUrl({
            page: 'policy_edit',
            policyName: lifecycle.ilm.policy,
          })}
          target="_blank"
        >
          {i18n.translate('xpack.streams.streamsRetentionColumn.ilmBadgeLabel', {
            defaultMessage: 'ILM policy: {name}',
            values: {
              name: lifecycle.ilm.policy,
            },
          })}
        </EuiLink>
      </EuiBadge>
    );
  }

  if (isDslLifecycle(lifecycle)) {
    return lifecycle.dsl.data_retention || <EuiIcon type="infinity" size="m" />;
  }

  return (
    <EuiText color="subdued">
      {i18n.translate('xpack.streams.streamsRetentionColumn.noDataLabel', {
        defaultMessage: 'N/A',
      })}
    </EuiText>
  );
}
