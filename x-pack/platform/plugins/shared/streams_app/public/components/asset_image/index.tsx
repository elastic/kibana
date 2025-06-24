/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage, EuiImageProps, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useState } from 'react';

const imageSets = {
  welcome: {
    light: () => import('./welcome_light.png'),
    dark: () => import('./welcome_dark.png'),
    alt: i18n.translate('xpack.streams.streamDetailView.welcomeImage', {
      defaultMessage: 'Welcome image for the streams app',
    }),
  },
  noResults: {
    light: () => import('./no_results_light.png'),
    dark: () => import('./no_results_dark.png'),
    alt: i18n.translate('xpack.streams.streamDetailView.noResultsImage', {
      defaultMessage: 'No results image for the streams app',
    }),
  },
  significantEventsEmptyState: {
    light: () => import('./sig_events_empty_state_light.png'),
    dark: () => import('./sig_events_empty_state_dark.png'),
    alt: i18n.translate('xpack.streams.significantEvents.emptyStateImage', {
      defaultMessage: 'Empty state illustration for the Significant events view',
    }),
  },
  addStreams: {
    light: () => import('./add_streams_light.png'),
    dark: () => import('./add_streams_dark.png'),
    alt: i18n.translate('xpack.streams.streamDetailView.addStreamsImage', {
      defaultMessage: 'Add streams image for the streams app',
    }),
  },
  quickLinksEmpty: {
    light: () => import('./quick_links_empty_light.png'),
    dark: () => import('./quick_links_empty_dark.png'),
    alt: i18n.translate('xpack.streams.streamDetailView.quickLinksEmptyImage', {
      defaultMessage: 'Quick links empty image for the streams app',
    }),
  },
  unableToGeneratePreview: {
    light: () => import('./unable_to_generate_preview_light.png'),
    dark: () => import('./unable_to_generate_preview_dark.png'),
    alt: i18n.translate('xpack.streams.streamDetailView.unableToGeneratePreviewImage', {
      defaultMessage: 'Unable to generate preview image for the streams app',
    }),
  },
  yourPreviewWillAppearHere: {
    light: () => import('./your_preview_will_appear_here_light.png'),
    dark: () => import('./your_preview_will_appear_here_dark.png'),
    alt: i18n.translate('xpack.streams.streamDetailView.yourPreviewWillAppearHereImage', {
      defaultMessage: 'Your preview will appear here image for the streams app',
    }),
  },
  processorsCannotBeAddedToRootStreams: {
    light: () => import('./processors_cannot_be_added_to_root_streams_light.png'),
    dark: () => import('./processors_cannot_be_added_to_root_streams_dark.png'),
    alt: i18n.translate(
      'xpack.streams.streamDetailView.processorsCannotBeAddedToRootStreamsImage',
      {
        defaultMessage: 'Processors cannot be added to root streams image for the streams app',
      }
    ),
  },
};

interface AssetImageProps extends Omit<EuiImageProps, 'src' | 'url' | 'alt'> {
  type?: keyof typeof imageSets;
}

export function AssetImage({ type = 'welcome', ...props }: AssetImageProps) {
  const { colorMode } = useEuiTheme();
  const { alt, dark, light } = imageSets[type];

  const [imageSrc, setImageSrc] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    const dynamicImageImport = colorMode === 'LIGHT' ? light() : dark();

    dynamicImageImport.then((module) => {
      if (isMounted) {
        setImageSrc(module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [colorMode, dark, light]);

  return imageSrc ? <EuiImage size="l" {...props} alt={alt} src={imageSrc} /> : null;
}
