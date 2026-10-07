/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import {
  EPISODES_KPIS_PANEL_ID,
  EPISODES_HISTOGRAM_PANEL_ID,
} from '../utils/episodes_panels_visibility';

export interface EpisodesPanelsToggleProps {
  isKpisHidden: boolean;
  isHistogramHidden: boolean;
  onToggleKpis: () => void;
  onToggleHistogram: () => void;
}

/**
 * Discover-style toggles for KPIs and the histogram.
 * Mounted in the table toolbar (before keyboard shortcuts) so position stays fixed.
 */
export const EpisodesPanelsToggle = ({
  isKpisHidden,
  isHistogramHidden,
  onToggleKpis,
  onToggleHistogram,
}: EpisodesPanelsToggleProps) => {
  const handleToggleKpis = useCallback(() => {
    onToggleKpis();
  }, [onToggleKpis]);

  const handleToggleHistogram = useCallback(() => {
    onToggleHistogram();
  }, [onToggleHistogram]);

  const kpisLabel = isKpisHidden
    ? i18n.translate('xpack.alertingV2.episodes.panelsToggle.showKpisButton', {
        defaultMessage: 'Show KPIs',
      })
    : i18n.translate('xpack.alertingV2.episodes.panelsToggle.hideKpisButton', {
        defaultMessage: 'Hide KPIs',
      });

  const visualizationLabel = isHistogramHidden
    ? i18n.translate('xpack.alertingV2.episodes.panelsToggle.showVisualizationButton', {
        defaultMessage: 'Show visualization',
      })
    : i18n.translate('xpack.alertingV2.episodes.panelsToggle.hideVisualizationButton', {
        defaultMessage: 'Hide visualization',
      });

  return (
    <IconButtonGroup
      data-test-subj="episodesPanelsToggle"
      legend={i18n.translate('xpack.alertingV2.episodes.panelsToggle.legend', {
        defaultMessage: 'Panels visibility',
      })}
      buttonSize="s"
      buttons={[
        {
          label: kpisLabel,
          iconType: isKpisHidden ? 'transitionTopIn' : 'transitionTopOut',
          'data-test-subj': isKpisHidden ? 'episodesShowKpisButton' : 'episodesHideKpisButton',
          'aria-expanded': !isKpisHidden,
          'aria-controls': EPISODES_KPIS_PANEL_ID,
          toolTipContent: kpisLabel,
          onClick: handleToggleKpis,
        },
        {
          label: visualizationLabel,
          iconType: isHistogramHidden ? 'transitionBottomIn' : 'transitionBottomOut',
          'data-test-subj': isHistogramHidden
            ? 'episodesShowHistogramButton'
            : 'episodesHideHistogramButton',
          'aria-expanded': !isHistogramHidden,
          'aria-controls': EPISODES_HISTOGRAM_PANEL_ID,
          toolTipContent: visualizationLabel,
          onClick: handleToggleHistogram,
        },
      ]}
    />
  );
};
