/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityStreamsFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import type { DiscoverFlyoutStreamFieldProps } from './discover_flyout_stream_field';
import type { DiscoverFlyoutStreamProcessingLinkProps } from './discover_flyout_stream_processing_link';

const DiscoverFlyoutStreamField = dynamic(() =>
  import('./discover_flyout_stream_field').then((m) => ({ default: m.DiscoverFlyoutStreamField }))
);

export function createDiscoverFlyoutStreamFieldLink(
  services: Omit<DiscoverFlyoutStreamFieldProps, 'doc'>
) {
  return (props: ObservabilityStreamsFeatureRenderDeps) => (
    <DiscoverFlyoutStreamField {...services} {...props} />
  );
}

const DiscoverFlyoutStreamProcessingLink = dynamic(() =>
  import('./discover_flyout_stream_processing_link').then((m) => ({
    default: m.DiscoverFlyoutStreamProcessingLink,
  }))
);

export function createDiscoverFlyoutStreamProcessingLink(
  services: Omit<DiscoverFlyoutStreamProcessingLinkProps, 'doc' | 'dataView'>
) {
  return (props: ObservabilityStreamsFeatureRenderDeps) => (
    <DiscoverFlyoutStreamProcessingLink {...services} {...props} />
  );
}
