/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { useKibana } from '../../hooks/use_kibana';

export function MockAwsStreamsDiscoverButton({ streamName }: { streamName: string }) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const discoverLink = share.url.locators.useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: { query: { esql: `FROM ${streamName}` } },
    }),
    [streamName]
  );

  return (
    <EuiButtonIcon
      href={discoverLink}
      iconType="discoverApp"
      aria-label={i18n.translate('xpack.streams.mockStreamsTable.openDiscoverAriaLabel', {
        defaultMessage: 'Open {name} in Discover',
        values: { name: streamName },
      })}
      size="xs"
      color="primary"
    />
  );
}
