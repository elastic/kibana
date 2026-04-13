import type { ObservabilityStreamsFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import React from 'react';
import type { DiscoverFlyoutStreamFieldProps } from './discover_flyout_stream_field';
import type { DiscoverFlyoutStreamProcessingLinkProps } from './discover_flyout_stream_processing_link';
export declare function createDiscoverFlyoutStreamFieldLink(services: Omit<DiscoverFlyoutStreamFieldProps, 'doc'>): (props: ObservabilityStreamsFeatureRenderDeps) => React.JSX.Element;
export declare function createDiscoverFlyoutStreamProcessingLink(services: Omit<DiscoverFlyoutStreamProcessingLinkProps, 'doc' | 'dataView'>): (props: ObservabilityStreamsFeatureRenderDeps) => React.JSX.Element;
