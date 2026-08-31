/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiImageProps } from '@elastic/eui';
import { EuiImage, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';

const imageSets = {
  knowledgeIndicatorsEmptyState: {
    light: () => import('./knowledge_indicators_empty_state_light.svg'),
    dark: () => import('./knowledge_indicators_empty_state_dark.svg'),
    alt: i18n.translate('xpack.significantEventsApp.knowledgeIndicators.emptyStateImage', {
      defaultMessage: 'Empty state illustration for the Knowledge Indicators view',
    }),
  },
  significantEventsEmptyState: {
    light: () => import('./significant_events_empty_state_light.svg'),
    dark: () => import('./significant_events_empty_state_dark.svg'),
    alt: i18n.translate('xpack.significantEventsApp.significantEvents.emptyStateImage', {
      defaultMessage: 'Empty state illustration for the Significant events view',
    }),
  },
  barChart: {
    light: () => import('./bar_chart.svg'),
    dark: () => import('./bar_chart.svg'),
    alt: i18n.translate('xpack.significantEventsApp.barChartImage', {
      defaultMessage: 'Bar chart image',
    }),
  },
};

type ImageType = keyof typeof imageSets;

interface AssetImageProps extends Omit<EuiImageProps, 'src' | 'url' | 'alt'> {
  type: ImageType;
}

export function AssetImage({ type, ...props }: AssetImageProps) {
  const { colorMode } = useEuiTheme();
  const [src, setSrc] = useState<string>();

  const imageSet = imageSets[type];
  const isDark = colorMode === 'DARK';

  useEffect(() => {
    const loader = isDark ? imageSet.dark : imageSet.light;
    let cancelled = false;
    loader().then((module) => {
      if (!cancelled) setSrc(module.default);
    });
    return () => {
      cancelled = true;
    };
  }, [imageSet, isDark]);

  const { size = 'm', ...rest } = props;
  return src ? <EuiImage size={size} src={src} alt={imageSet.alt} {...rest} /> : null;
}
