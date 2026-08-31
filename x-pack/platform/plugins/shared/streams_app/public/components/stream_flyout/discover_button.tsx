/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDiscoverStreamLink, type DiscoverBadgeButtonProps } from '../stream_badges';

export function ViewInDiscoverButton({
  stream,
  hasDataStream = false,
  indexMode,
}: Omit<DiscoverBadgeButtonProps, 'spellOut'>) {
  const discoverLink = useDiscoverStreamLink({ stream, hasDataStream, indexMode });

  if (!discoverLink) {
    return null;
  }

  return (
    <EuiButton
      color="text"
      data-test-subj={`streamsDiscoverActionButton-${stream.name}`}
      href={discoverLink}
      iconType="discoverApp"
      size="s"
    >
      {i18n.translate('xpack.streams.flyout.openInDiscoverBadgeLabel', {
        defaultMessage: 'View in Discover',
      })}
    </EuiButton>
  );
}
