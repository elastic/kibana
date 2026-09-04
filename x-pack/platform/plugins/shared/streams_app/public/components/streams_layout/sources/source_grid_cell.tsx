/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHealth,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import type { SourceStatus, SourceViewModel } from './types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from './source_type_config';

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  live: i18n.translate('xpack.streams.sources.status.liveLabel', {
    defaultMessage: 'Live',
  }),
  provisioning: i18n.translate('xpack.streams.sources.status.provisioningLabel', {
    defaultMessage: 'Provisioning',
  }),
  failed: i18n.translate('xpack.streams.sources.status.failedLabel', {
    defaultMessage: 'Failed',
  }),
};

const SOURCE_STATUS_COLORS: Record<SourceStatus, 'success' | 'warning' | 'danger'> = {
  live: 'success',
  provisioning: 'warning',
  failed: 'danger',
};

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
    case 'status':
      return (
        <EuiHealth color={SOURCE_STATUS_COLORS[source.status]}>
          {SOURCE_STATUS_LABELS[source.status]}
        </EuiHealth>
      );
    case 'throughput':
      return source.throughput ?? '—';
    case 'lastEvent':
      return source.lastEvent ?? '—';
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

export const SourceRowActions = ({
  source,
  onRequestDelete,
}: {
  source: SourceViewModel;
  onRequestDelete: (source: SourceViewModel) => void;
}) => {
  const [isOpen, { off: closePopover, toggle }] = useBoolean(false);
  const sourceName = source.name ?? source.id;
  const actionsLabel = i18n.translate('xpack.streams.sources.table.rowActionsAriaLabel', {
    defaultMessage: 'Open actions for {sourceName}',
    values: { sourceName },
  });

  return (
    <EuiPopover
      aria-label={actionsLabel}
      button={
        <EuiToolTip
          content={i18n.translate('xpack.streams.sources.table.rowActionsTooltip', {
            defaultMessage: 'Source actions',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="ellipsis"
            onClick={toggle}
            aria-label={actionsLabel}
            data-test-subj="streamsSourceRowActionsButton"
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="leftUp"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            onClick={() => {
              closePopover();
              onRequestDelete(source);
            }}
            data-test-subj="streamsSourceDeleteAction"
          >
            {i18n.translate('xpack.streams.sources.table.deleteMenuItemLabel', {
              defaultMessage: 'Delete',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

export const getSourceSortableValue = (source: SourceViewModel, columnId: string): string => {
  switch (columnId) {
    case 'name':
      return source.name ?? source.id;
    case 'type':
      return SOURCE_TYPE_CONFIG_BY_TYPE[source.type].shortLabel;
    case 'status':
      return SOURCE_STATUS_LABELS[source.status];
    case 'throughput':
      return source.throughput ?? '';
    case 'lastEvent':
      return source.lastEvent ?? '';
    case 'destinations':
      return source.destinations.join(', ');
    default:
      return '';
  }
};
