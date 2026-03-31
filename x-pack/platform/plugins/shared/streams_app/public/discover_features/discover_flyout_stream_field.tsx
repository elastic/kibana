/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { EuiFlexGroup, EuiIconTip, EuiLoadingSpinner, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ContentFrameworkSection } from '@kbn/unified-doc-viewer-plugin/public';
import type { StreamsAppLocator } from '../../common/locators';
import { useResolvedDefinitionName } from './use_resolved_definition_name';

export interface DiscoverFlyoutStreamFieldProps {
  doc: DataTableRecord;
  streamsRepositoryClient: StreamsRepositoryClient;
  locator: StreamsAppLocator;
  renderCpsWarning?: boolean;
}

export function DiscoverFlyoutStreamField(props: DiscoverFlyoutStreamFieldProps) {
  return (
    <ContentFrameworkSection
      id="discoverFlyoutStreamField"
      title={i18n.translate('xpack.streams.discoverFlyoutStreamField.title', {
        defaultMessage: 'Stream',
      })}
    >
      <DiscoverFlyoutStreamFieldContent {...props} />
    </ContentFrameworkSection>
  );
}

function DiscoverFlyoutStreamFieldContent({
  streamsRepositoryClient,
  doc,
  locator,
  renderCpsWarning,
}: DiscoverFlyoutStreamFieldProps) {
  const { value, loading, error } = useResolvedDefinitionName({
    streamsRepositoryClient,
    doc,
    cpsHasLinkedProjects: renderCpsWarning,
  });

  if (loading) return <EuiLoadingSpinner size="s" />;

  const { name, existsLocally } = value ?? {};

  if (!name || error) return <span>-</span>;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      {existsLocally ? (
        <EuiLink href={locator.getRedirectUrl({ name })}>
          <EuiText size="xs">{name}</EuiText>
        </EuiLink>
      ) : (
        <EuiText size="xs">{name}</EuiText>
      )}
      {renderCpsWarning && <CpsWarningIcon existsLocally={existsLocally ?? false} />}
    </EuiFlexGroup>
  );
}

const CPS_WARNING_MESSAGE = i18n.translate('xpack.streams.discoverFlyout.cpsWarning', {
  defaultMessage:
    'Cross-project search is active. This document may come from a linked project and might not be available in Streams.',
});

const CPS_WARNING_NOT_LOCAL_MESSAGE = i18n.translate(
  'xpack.streams.discoverFlyout.cpsWarningNotLocal',
  {
    defaultMessage: 'This document comes from a linked project and is not available in Streams.',
  }
);

const CpsWarningIcon = ({ existsLocally }: { existsLocally: boolean }) => (
  <EuiIconTip
    content={existsLocally ? CPS_WARNING_MESSAGE : CPS_WARNING_NOT_LOCAL_MESSAGE}
    type="warning"
    size="s"
    color="warning"
    data-test-subj="cpsStreamsWarningIcon"
    anchorProps={{
      css: { display: 'flex' },
    }}
  />
);
