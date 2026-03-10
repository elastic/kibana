/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { ChromeStart } from '@kbn/core/public';

export interface OsqueryResultsFlyoutProps {
  hit: DataTableRecord;
  hits: DataTableRecord[];
  dataView: DataView;
  columns: string[];
  columnsMeta?: DataTableColumnsMeta;
  onClose: () => void;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  onAddColumn?: (column: string) => void;
  onRemoveColumn?: (column: string) => void;
  toastNotifications?: ToastsStart;
  chrome: ChromeStart;
}

const FLYOUT_TITLE = i18n.translate('xpack.osquery.resultsTable.flyout.title', {
  defaultMessage: 'Osquery Result',
});

export const OsqueryResultsFlyout: React.FC<OsqueryResultsFlyoutProps> = ({
  hit,
  hits,
  dataView,
  columns,
  columnsMeta,
  onClose,
  setExpandedDoc,
  onAddColumn,
  onRemoveColumn,
  toastNotifications,
  chrome,
}) => {
  const services = useMemo(
    () => ({
      toastNotifications,
      chrome,
    }),
    [toastNotifications, chrome]
  );

  const handleAddColumn = useCallback(
    (column: string) => {
      onAddColumn?.(column);
    },
    [onAddColumn]
  );

  const handleRemoveColumn = useCallback(
    (column: string) => {
      onRemoveColumn?.(column);
    },
    [onRemoveColumn]
  );

  return (
    <UnifiedDocViewerFlyout
      flyoutTitle={FLYOUT_TITLE}
      services={services}
      isEsqlQuery={false}
      hit={hit}
      hits={hits}
      dataView={dataView}
      columns={columns}
      columnsMeta={columnsMeta}
      onAddColumn={handleAddColumn}
      onRemoveColumn={handleRemoveColumn}
      onClose={onClose}
      setExpandedDoc={setExpandedDoc}
      data-test-subj="osqueryResultsFlyout"
    />
  );
};

OsqueryResultsFlyout.displayName = 'OsqueryResultsFlyout';
