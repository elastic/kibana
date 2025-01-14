/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AvailableReferenceLineIcon } from '@kbn/expression-xy-plugin/common';
import type { AvailableMetricIcon } from '@kbn/expression-metric-vis-plugin/common';
import { iconSortCriteria, type IconSet, sharedSetOfIcons } from '@kbn/visualization-ui-components';

export const referenceLineIconsSet: IconSet<AvailableReferenceLineIcon> = sharedSetOfIcons;

export const metricIconsSet: IconSet<AvailableMetricIcon> = [
  ...sharedSetOfIcons,
  // use spread here to avoid to cast single entries
  ...([
    {
      value: 'sortUp',
      label: i18n.translate('xpack.lens.metric.iconSelect.sortUpLabel', {
        defaultMessage: 'Sort up',
      }),
    },
    {
      value: 'sortDown',
      label: i18n.translate('xpack.lens.metric.iconSelect.sortDownLabel', {
        defaultMessage: 'Sort down',
      }),
    },
    {
      value: 'compute',
      label: i18n.translate('xpack.lens.metric.iconSelect.computeLabel', {
        defaultMessage: 'Compute',
      }),
    },
    {
      value: 'globe',
      label: i18n.translate('xpack.lens.metric.iconSelect.globeLabel', {
        defaultMessage: 'Globe',
      }),
    },
    {
      value: 'temperature',
      label: i18n.translate('xpack.lens.metric.iconSelect.temperatureLabel', {
        defaultMessage: 'Temperature',
      }),
    },
    {
      value: 'heart',
      label: i18n.translate('xpack.lens.metric.iconSelect.heartLabel', { defaultMessage: 'Heart' }),
    },
    {
      value: 'mapMarker',
      label: i18n.translate('xpack.lens.metric.iconSelect.mapMarkerLabel', {
        defaultMessage: 'Map Marker',
      }),
    },
    {
      value: 'pin',
      label: i18n.translate('xpack.lens.metric.iconSelect.mapPinLabel', {
        defaultMessage: 'Map Pin',
      }),
    },
    {
      value: 'starEmpty',
      label: i18n.translate('xpack.lens.metric.iconSelect.starLabel', { defaultMessage: 'Star' }),
    },
  ] as const),
].sort(iconSortCriteria);
