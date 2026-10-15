/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DATA_STREAMS_NODE_TYPE, type DataStreamsNode } from './types';

export const DATA_STREAMS_NODE_ID = 'data-streams';

export const getDataStreamsTitle = (): string =>
  i18n.translate('xpack.streams.canvas.dataStreamsNode.title', {
    defaultMessage: 'Data streams',
  });

export const getDataStreamsSubtitle = (): string =>
  i18n.translate('xpack.streams.canvas.dataStreamsNode.subtitle', {
    defaultMessage: 'Not matched by destination patterns',
  });

export const getDataStreamsAriaLabel = (count: number, expanded: boolean): string =>
  expanded
    ? i18n.translate('xpack.streams.canvas.dataStreamsNode.ariaLabelExpanded', {
        defaultMessage: 'Data streams, {count} not matched by destination patterns, expanded',
        values: { count },
      })
    : i18n.translate('xpack.streams.canvas.dataStreamsNode.ariaLabelCollapsed', {
        defaultMessage: 'Data streams, {count} not matched by destination patterns, collapsed',
        values: { count },
      });

export const buildDataStreamsNode = (count: number, expanded: boolean): DataStreamsNode => ({
  id: DATA_STREAMS_NODE_ID,
  type: DATA_STREAMS_NODE_TYPE,
  position: { x: 0, y: 0 },
  deletable: false,
  ariaLabel: getDataStreamsAriaLabel(count, expanded),
  data: {
    title: getDataStreamsTitle(),
    subtitle: getDataStreamsSubtitle(),
    count,
    expanded,
  },
});
