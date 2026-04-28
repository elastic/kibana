/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIconTip, EuiLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { StreamsAppLocator } from '../../common/locators';

export interface StreamLinkContentProps {
  name: string | undefined;
  existsLocally: boolean | undefined;
  loading: boolean;
  error: Error | undefined;
  locator: StreamsAppLocator;
  renderCpsWarning?: boolean;
}

export const StreamLinkContent = ({
  name,
  existsLocally,
  loading,
  error,
  locator,
  renderCpsWarning,
}: StreamLinkContentProps) => {
  if (loading) return <EuiLoadingSpinner size="s" />;

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
};

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
    anchorProps={{
      css: { display: 'flex' },
    }}
    iconProps={{
      'data-test-subj': 'cpsStreamsWarningIcon',
    }}
  />
);
