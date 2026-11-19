/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AvailableReferenceLineIcon } from '@kbn/expression-xy-plugin/common';
import type { AvailableMetricIcon } from '@kbn/expression-metric-vis-plugin/common';
import {
  iconSortCriteria,
  type IconSet,
  sharedSetOfIcons,
  annotationReferenceLineSharedSetOfIcons,
  emptyIconEntry,
} from '@kbn/visualization-ui-components';

export const referenceLineIconsSet: IconSet<AvailableReferenceLineIcon> = [
  emptyIconEntry,
  ...annotationReferenceLineSharedSetOfIcons,
].sort(iconSortCriteria);

export const metricIconsSet: IconSet<AvailableMetricIcon> = [
  emptyIconEntry,
  ...sharedSetOfIcons,
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
      value: 'pin',
      label: i18n.translate('xpack.lens.metric.iconSelect.mapPinLabel', {
        defaultMessage: 'Map Pin',
      }),
    },
  ] as const),
].sort(iconSortCriteria);
