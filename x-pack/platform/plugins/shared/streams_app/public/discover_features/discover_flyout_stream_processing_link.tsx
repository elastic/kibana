/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { EuiLoadingSpinner, EuiLink, EuiIcon, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { StreamsAppLocator } from '../../common/locators';
import { useResolvedDefinitionName } from './use_resolved_definition_name';

export interface DiscoverFlyoutStreamProcessingLinkProps {
  doc: DataTableRecord;
  streamsRepositoryClient: StreamsRepositoryClient;
  coreApplication: CoreStart['application'];
  locator: StreamsAppLocator;
}

export function DiscoverFlyoutStreamProcessingLink({
  streamsRepositoryClient,
  doc,
  locator,
  coreApplication,
}: DiscoverFlyoutStreamProcessingLinkProps) {
  const { value, loading, error } = useResolvedDefinitionName({
    streamsRepositoryClient,
    doc,
  });

  if (loading) return <EuiLoadingSpinner size="s" />;

  if (!value || error) return null;

  const href = locator.getRedirectUrl({
    name: value,
    managementTab: 'enrich',
    pageState: {
      v: 1,
      dataSources: [
        {
          type: 'kql-samples',
          enabled: true,
          name: i18n.translate('xpack.streams.discoverFlyoutStreamProcessingLink', {
            defaultMessage: 'Discover document',
          }),
          query: {
            language: 'kuery',
            query: `_id: ${doc.raw._id}`,
          },
        },
      ],
    },
  });

  return (
    <RedirectAppLinks coreStart={{ application: coreApplication }}>
      <EuiLink href={href}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiIcon type="sparkles" size="s" />
          {i18n.translate('xpack.streams.discoverFlyoutStreamProcessingLink', {
            defaultMessage: 'Parse content in Streams',
          })}
        </EuiFlexGroup>
      </EuiLink>
    </RedirectAppLinks>
  );
}
