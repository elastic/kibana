/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import {
  EuiLoadingSpinner,
  EuiLink,
  EuiIcon,
  EuiFlexGroup,
  EuiToolTip,
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { css } from '@emotion/react';
import type { StreamsAppLocator } from '../../common/locators';
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
  const { euiTheme } = useEuiTheme();
  const { value, loading, error } = useResolvedDefinitionName({
    streamsRepositoryClient,
    doc,
  });

  if (loading) return <EuiLoadingSpinner size="s" />;

  if (!value || error) return null;

  const hasDocumentId = !!doc.raw._id;

  const href = locator.getRedirectUrl({
    name: value,
    managementTab: 'processing',
    pageState: hasDocumentId
      ? {
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
        }
      : undefined,
  });

  const message = hasDocumentId
    ? i18n.translate('xpack.streams.discoverFlyoutStreamProcessingLink', {
        defaultMessage: 'Parse content in Streams',
      })
    : i18n.translate('xpack.streams.discoverFlyoutStreamProcessingLinkEdit', {
        defaultMessage: 'Edit processing in Streams',
      });

  return (
    <RedirectAppLinks
      coreStart={{ application: coreApplication }}
      css={css`
        min-width: 0;
      `}
    >
      <EuiLink href={href}>
        <EuiToolTip content={message} display="block">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiIcon
              type="sparkles"
              size="s"
              css={css`
                margin-left: ${euiTheme.size.s};
              `}
            />
            <EuiText size="xs" className="eui-textTruncate">
              {message}
            </EuiText>
          </EuiFlexGroup>
        </EuiToolTip>
      </EuiLink>
    </RedirectAppLinks>
  );
}
