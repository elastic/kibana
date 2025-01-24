/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { RandomSamplingIcon } from '@kbn/random-sampling';
import type { DatasourceLayerPanelProps } from '../../types';
import type { FormBasedPrivateState } from './types';
import { ChangeIndexPattern } from '../../shared_components/dataview_picker/dataview_picker';
import { getSamplingValue } from './utils';
import { getIgnoreGlobalFilterIcon } from '../../shared_components/ignore_global_filter';

export interface FormBasedLayerPanelProps extends DatasourceLayerPanelProps<FormBasedPrivateState> {
  state: FormBasedPrivateState;
  onChangeIndexPattern: (newId: string) => void;
}

export function LayerPanel({
  state,
  layerId,
  onChangeIndexPattern,
  dataViews,
}: FormBasedLayerPanelProps) {
  const layer = state.layers[layerId];
  const { euiTheme } = useEuiTheme();

  const indexPattern = dataViews.indexPatterns[layer.indexPatternId];
  const notFoundTitleLabel = i18n.translate('xpack.lens.layerPanel.missingDataView', {
    defaultMessage: 'Data view not found',
  });
  const indexPatternRefs = dataViews.indexPatternRefs.map((ref) => {
    const isPersisted = dataViews.indexPatterns[ref.id]?.isPersisted ?? true;
    return {
      ...ref,
      isAdhoc: !isPersisted,
    };
  });

  const samplingValue = getSamplingValue(layer);
  const extraIcons = [];
  if (layer.ignoreGlobalFilters) {
    extraIcons.push(
      getIgnoreGlobalFilterIcon({
        color: euiTheme.colors.disabledText,
        dataTestSubj: 'lnsChangeIndexPatternIgnoringFilters',
      })
    );
  }
  if (samplingValue !== 1) {
    extraIcons.push({
      component: <RandomSamplingIcon color={euiTheme.colors.disabledText} fill="currentColor" />,
      value: `${samplingValue * 100}%`,
      tooltipValue: i18n.translate('xpack.lens.indexPattern.randomSamplingInfo', {
        defaultMessage: '{value}% sampling',
        values: {
          value: samplingValue * 100,
        },
      }),
      'data-test-subj': 'lnsChangeIndexPatternSamplingInfo',
    });
  }

  return (
    <ChangeIndexPattern
      data-test-subj="indexPattern-switcher"
      trigger={{
        label: indexPattern?.name || notFoundTitleLabel,
        title: indexPattern?.title || notFoundTitleLabel,
        'data-test-subj': 'lns_layerIndexPatternLabel',
        size: 's',
        fontWeight: 'normal',
        extraIcons,
      }}
      indexPatternId={layer.indexPatternId}
      indexPatternRefs={indexPatternRefs}
      isMissingCurrent={!indexPattern}
      onChangeIndexPattern={onChangeIndexPattern}
    />
  );
}
