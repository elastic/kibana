/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonIcon, EuiLink } from '@elastic/eui';
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
import { useKibana } from '../../hooks/use_kibana';
import { getIndexPatterns } from '../../util/hierarchy_helpers';

export function ClassicStreamBadge() {
  return (
    <EuiBadge>
      {i18n.translate('xpack.streams.entityDetailViewWithoutParams.unmanagedBadgeLabel', {
        defaultMessage: 'Classic',
      })}
    </EuiBadge>
  );
}

export function LifecycleBadge({ lifecycle }: { lifecycle: IngestStreamEffectiveLifecycle }) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

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
        >
          {i18n.translate('xpack.streams.entityDetailViewWithoutParams.ilmBadgeLabel', {
            defaultMessage: 'ILM Policy: {name}',
            values: { name: lifecycle.ilm.policy },
          })}
        </EuiLink>
      </EuiBadge>
    );
  }

  if (isErrorLifecycle(lifecycle)) {
    return (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.errorBadgeLabel', {
          defaultMessage: 'Error: {message}',
          values: { message: lifecycle.error.message },
        })}
      </EuiBadge>
    );
  }
  if (isDslLifecycle(lifecycle)) {
    return (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.dslBadgeLabel', {
          defaultMessage: 'Retention: {retention}',
          values: { retention: lifecycle.dsl.data_retention || '∞' },
        })}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="hollow">
      {i18n.translate('xpack.streams.entityDetailViewWithoutParams.disabledLifecycleBadgeLabel', {
        defaultMessage: 'Retention: Disabled',
      })}
    </EuiBadge>
  );
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
    />
  );
}
