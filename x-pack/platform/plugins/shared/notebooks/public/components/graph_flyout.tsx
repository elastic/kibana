/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiFlyoutHeader, EuiLoadingSpinner, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NotebookFlyout } from './notebook_flyout';

const LazyDependencyGraph = React.lazy(async () => {
  const { DependencyGraph } = await import('./dependency_graph');
  return { default: DependencyGraph };
});

/** The dependency graph in a push flyout, leaving the notebook usable beside it. */
export const GraphFlyout = ({
  onClose,
  onSelectCell,
}: {
  onClose: () => void;
  onSelectCell: (cellId: string) => void;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'notebookGraph' });
  return (
    <NotebookFlyout
      type="push"
      ownFocus={false}
      hidesRunButtons={false}
      paddingSize="none"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="notebookGraphFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {i18n.translate('xpack.notebook.graph.title', { defaultMessage: 'Dependency graph' })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <div css={{ flex: 1, minHeight: 0 }}>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <LazyDependencyGraph onSelectCell={onSelectCell} />
        </Suspense>
      </div>
    </NotebookFlyout>
  );
};
