/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { EuiLoadingSpinner, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { ContentFrameworkSection } from '@kbn/unified-doc-viewer-plugin/public';
import type { StreamsAppLocator } from '../../common/locators';
import { useResolvedDefinitionName } from './use_resolved_definition_name';

export interface DiscoverFlyoutStreamFieldProps {
  doc: DataTableRecord;
  streamsRepositoryClient: StreamsRepositoryClient;
  coreApplication: CoreStart['application'];
  locator: StreamsAppLocator;
}

export function DiscoverFlyoutStreamField(props: DiscoverFlyoutStreamFieldProps) {
  return (
    <RedirectAppLinks coreStart={{ application: props.coreApplication }}>
      <ContentFrameworkSection
        id="discoverFlyoutStreamField"
        title={i18n.translate('xpack.streams.discoverFlyoutStreamField.title', {
          defaultMessage: 'Stream',
        })}
      >
        <DiscoverFlyoutStreamFieldContent {...props} />
      </ContentFrameworkSection>
    </RedirectAppLinks>
  );
}

function DiscoverFlyoutStreamFieldContent({
  streamsRepositoryClient,
  doc,
  locator,
}: DiscoverFlyoutStreamFieldProps) {
  const { value, loading, error } = useResolvedDefinitionName({
    streamsRepositoryClient,
    doc,
  });

  if (loading) return <EuiLoadingSpinner size="s" />;

  if (!value || error) return <span>-</span>;

  return (
    <EuiLink href={locator.getRedirectUrl({ name: value })}>
      <EuiText size="xs">{value}</EuiText>
    </EuiLink>
  );
}
