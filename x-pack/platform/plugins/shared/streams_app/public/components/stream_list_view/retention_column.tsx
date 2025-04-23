/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiLink, EuiBadge, EuiIcon, EuiToolTip } from '@elastic/eui';
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
import { StreamTreeWithLevel } from './tree_table';

export function RetentionColumn({ stream }: { stream: StreamTreeWithLevel }) {
  // group stream.definitions by their effective lifecycle and collect in a map. afterwards render the required retention badges
  const retentionBadges = stream.definitions.reduce((acc, definition) => {
    if (definition.effective_lifecycle) {
      const lifecycleKey = JSON.stringify(definition.effective_lifecycle);
      acc[lifecycleKey] = acc[lifecycleKey] || [];
      acc[lifecycleKey].push(definition.server);
    }
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <EuiText color="subdued">
      {Object.entries(retentionBadges).map(([lifecycle, servers]) => (
        <RetentionBadge
          key={lifecycle}
          lifecycle={JSON.parse(lifecycle) as IngestStreamEffectiveLifecycle}
          servers={servers}
        />
      ))}
    </EuiText>
  );
}

function RetentionBadge({
  lifecycle,
  servers,
}: {
  lifecycle: IngestStreamEffectiveLifecycle;
  servers: string[];
}) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);
  let badge: React.ReactNode = null;

  if (isErrorLifecycle(lifecycle)) {
    badge = <EuiBadge color="hollow">{lifecycle.error.message}</EuiBadge>;
  } else if (isIlmLifecycle(lifecycle)) {
    badge = (
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
  } else if (isDslLifecycle(lifecycle)) {
    badge = lifecycle.dsl.data_retention || <EuiIcon type="infinity" size="m" />;
  } else {
    badge = (
      <EuiText color="subdued">
        {i18n.translate('xpack.streams.streamsRetentionColumn.disabledLifecycleBadgeLabel', {
          defaultMessage: 'Disabled',
        })}
      </EuiText>
    );
  }

  return (
    <EuiToolTip content={servers.join(', ')} position="top" delay="long">
      <span>{badge}</span>
    </EuiToolTip>
  );
}
