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
