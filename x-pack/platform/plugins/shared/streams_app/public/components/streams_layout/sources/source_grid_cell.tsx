/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SourceViewModel } from './types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from './source_type_config';

interface SourceGridCellProps {
  source: SourceViewModel;
  columnId: string;
  onOpen: (sourceId: string) => void;
}

export const SourceGridCell = ({ source, columnId, onOpen }: SourceGridCellProps) => {
  switch (columnId) {
    case 'name':
      return (
        <EuiButtonEmpty
          flush="left"
          size="xs"
          onClick={() => onOpen(source.id)}
          data-test-subj="streamsSourceNameLink"
        >
          {source.name ?? source.id}
        </EuiButtonEmpty>
      );
    case 'type':
      return (
        <EuiBadge color="hollow">{SOURCE_TYPE_CONFIG_BY_TYPE[source.type].shortLabel}</EuiBadge>
      );
    case 'destinations':
      return source.destinations.length > 0
        ? source.destinations.join(', ')
        : i18n.translate('xpack.streams.sources.table.noDestinationsLabel', {
            defaultMessage: 'Not connected',
          });
    default:
      return null;
  }
};

export const getSourceSortableValue = (source: SourceViewModel, columnId: string): string => {
  switch (columnId) {
    case 'name':
      return source.name ?? source.id;
    case 'type':
      return SOURCE_TYPE_CONFIG_BY_TYPE[source.type].shortLabel;
    case 'destinations':
      return source.destinations.join(', ');
    default:
      return '';
  }
};
