/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme, EuiIconTip } from '@elastic/eui';
import { IconChartBarReferenceLine, IconChartBarAnnotations } from '@kbn/chart-icons';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { getIgnoreGlobalFilterIcon } from '../../../shared_components/ignore_global_filter/data_view_picker_icon';
import type {
  VisualizationLayerHeaderContentProps,
  VisualizationLayerWidgetProps,
} from '../../../types';
import { State, XYAnnotationLayerConfig } from '../types';
import { annotationLayerHasUnsavedChanges } from '../state_helpers';
import { ChangeIndexPattern, StaticHeader } from '../../../shared_components';
import {
  getAnnotationLayerTitle,
  isAnnotationsLayer,
  isReferenceLayer,
} from '../visualization_helpers';

export function LayerHeader(props: VisualizationLayerWidgetProps<State>) {
  const layer = props.state.layers.find((l) => l.layerId === props.layerId);
  if (!layer) {
    return null;
  }
  if (isReferenceLayer(layer)) {
    return <ReferenceLayerHeader />;
  }
  if (isAnnotationsLayer(layer)) {
    return (
      <AnnotationsLayerHeader
        title={getAnnotationLayerTitle(layer)}
        hasUnsavedChanges={annotationLayerHasUnsavedChanges(layer)}
      />
    );
  }
  return null;
}

export function LayerHeaderContent(props: VisualizationLayerHeaderContentProps<State>) {
  const layer = props.state.layers.find((l) => l.layerId === props.layerId);
  if (layer && isAnnotationsLayer(layer)) {
    return <AnnotationLayerHeaderContent {...props} />;
  }
  return null;
}

export function ReferenceLayerHeader() {
  return (
    <StaticHeader
      icon={IconChartBarReferenceLine}
      label={i18n.translate('xpack.lens.xyChart.layerReferenceLineLabel', {
        defaultMessage: 'Reference lines',
      })}
    />
  );
}

export function AnnotationsLayerHeader({
  title,
  hasUnsavedChanges,
}: {
  title: string | undefined;
  hasUnsavedChanges: boolean;
}) {
  return (
    <StaticHeader
      icon={IconChartBarAnnotations}
      label={
        title ||
        i18n.translate('xpack.lens.xyChart.layerAnnotationsLabel', {
          defaultMessage: 'Annotations',
        })
      }
      indicator={
        hasUnsavedChanges && (
          <div
            css={css`
              padding-bottom: 3px;
              padding-left: 4px;
            `}
          >
            <EuiIconTip
              content={i18n.translate('xpack.lens.xyChart.unsavedChanges', {
                defaultMessage: 'Unsaved changes',
              })}
              type="dot"
              color={euiThemeVars.euiColorSuccess}
            />
          </div>
        )
      }
    />
  );
}

function AnnotationLayerHeaderContent({
  frame,
  state,
  layerId,
  onChangeIndexPattern,
}: VisualizationLayerHeaderContentProps<State>) {
  const { euiTheme } = useEuiTheme();
  const notFoundTitleLabel = i18n.translate('xpack.lens.layerPanel.missingDataView', {
    defaultMessage: 'Data view not found',
  });
  const layerIndex = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[layerIndex] as XYAnnotationLayerConfig;
  const currentIndexPattern = frame.dataViews.indexPatterns[layer.indexPatternId];

  return (
    <ChangeIndexPattern
      data-test-subj="indexPattern-switcher"
      trigger={{
        label: currentIndexPattern?.name || notFoundTitleLabel,
        title: currentIndexPattern?.title || notFoundTitleLabel,
        'data-test-subj': 'lns_layerIndexPatternLabel',
        size: 's',
        fontWeight: 'normal',
        extraIcons: layer.ignoreGlobalFilters
          ? [
              getIgnoreGlobalFilterIcon({
                color: euiTheme.colors.disabledText,
                dataTestSubj: 'lnsChangeIndexPatternIgnoringFilters',
              }),
            ]
          : undefined,
      }}
      indexPatternId={layer.indexPatternId}
      indexPatternRefs={frame.dataViews.indexPatternRefs}
      isMissingCurrent={!currentIndexPattern}
      onChangeIndexPattern={onChangeIndexPattern}
    />
  );
}
