/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsFeatureRenderDeps } from '@kbn/discover-shared-plugin/public/services/discover_features';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import { DiscoverStreamsLinkProps } from './discover_streams_link';

export const DiscoverStreamsLink = dynamic(() =>
  import('./discover_streams_link').then((m) => ({ default: m.DiscoverStreamsLink }))
);

export function createDiscoverStreamsLink(services: Omit<DiscoverStreamsLinkProps, 'doc'>) {
  return (props: StreamsFeatureRenderDeps) => <DiscoverStreamsLink {...services} {...props} />;
}
