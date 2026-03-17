/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-plugin/common';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { ChromeStart } from '@kbn/core-chrome-browser';

export interface OsqueryResultsFlyoutProps {
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

const OsqueryResultsFlyoutLazy = React.lazy(() =>
  import('./results_flyout_content').then((m) => ({
    default: m.OsqueryResultsFlyoutContent,
  }))
);

const DocumentViewerUnavailableFallback = () => (
  <EuiCallOut
    title={i18n.translate('xpack.osquery.results.flyout.unavailableTitle', {
      defaultMessage: 'Document viewer unavailable',
    })}
    color="warning"
    iconType="eyeClosed"
    data-test-subj="osqueryResultsFlyoutUnavailable"
  >
    <p>
      {i18n.translate('xpack.osquery.results.flyout.unavailableDescription', {
        defaultMessage: 'The document detail view is not available in this environment.',
      })}
    </p>
  </EuiCallOut>
);

interface DocViewerErrorBoundaryState {
  hasError: boolean;
}

class DocViewerErrorBoundary extends React.Component<
  React.PropsWithChildren<Record<string, unknown>>,
  DocViewerErrorBoundaryState
> {
  state: DocViewerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DocViewerErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <DocumentViewerUnavailableFallback />;
    }

    return this.props.children;
  }
}

const OsqueryResultsFlyoutComponent: React.FC<OsqueryResultsFlyoutProps> = (props) => (
  <DocViewerErrorBoundary>
    <Suspense
      fallback={<EuiLoadingSpinner size="xl" data-test-subj="osqueryResultsFlyoutLoading" />}
    >
      <OsqueryResultsFlyoutLazy {...props} />
    </Suspense>
  </DocViewerErrorBoundary>
);

export const OsqueryResultsFlyout = React.memo(OsqueryResultsFlyoutComponent);
