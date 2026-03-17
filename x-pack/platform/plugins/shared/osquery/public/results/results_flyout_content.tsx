/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * This file is loaded on demand when the document flyout is opened. It imports
 * UnifiedDocViewerFlyout so that when unifiedDocViewer is an optional plugin,
 * the import is not in the main bundle and won't fail at osquery load time.
 */

import React from 'react';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-plugin/common';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { ChromeStart } from '@kbn/core-chrome-browser';

const noop = () => {};

export interface OsqueryResultsFlyoutContentProps {
  hit: DataTableRecord;
  hits: DataTableRecord[];
  columns: string[];
  dataView: DataView;
  columnsMeta?: DataTableColumnsMeta;
  onClose: () => void;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  toastNotifications: ToastsStart;
  chrome: ChromeStart;
}

export const OsqueryResultsFlyoutContent: React.FC<OsqueryResultsFlyoutContentProps> = ({
  hit,
  hits,
  columns,
  dataView,
  columnsMeta,
  onClose,
  setExpandedDoc,
  toastNotifications,
  chrome,
}) => {
  const flyoutServices = React.useMemo(
    () => ({ toastNotifications, chrome }),
    [toastNotifications, chrome]
  );

  return (
    <UnifiedDocViewerFlyout
      services={flyoutServices}
      isEsqlQuery={false}
      hit={hit}
      hits={hits}
      columns={columns}
      columnsMeta={columnsMeta}
      dataView={dataView}
      setExpandedDoc={setExpandedDoc}
      onClose={onClose}
      onAddColumn={noop}
      onRemoveColumn={noop}
      flyoutType="overlay"
      data-test-subj="osqueryResultsFlyout"
    />
  );
};
