/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useNotebookServices } from '../services';
import { NotebookFlyout } from './notebook_flyout';

const LazyDependencyGraph = React.lazy(async () => {
  const { DependencyGraph } = await import('./dependency_graph');
  return { default: DependencyGraph };
});

/** Placeholder until the performance check exists: shows whether the developer toolbar turned it on. */
const PerformanceCheckStatus = () => {
  const { euiTheme } = useEuiTheme();
  const { performanceCheck$ } = useNotebookServices();
  const enabled = useObservable(performanceCheck$, performanceCheck$.getValue());
  return (
    <EuiText
      size="xs"
      color="subdued"
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
      `}
      data-test-subj="notebookPerformanceCheckStatus"
    >
      {enabled
        ? i18n.translate('xpack.notebook.performanceCheck.on', {
            defaultMessage: 'Performance check: on',
          })
        : i18n.translate('xpack.notebook.performanceCheck.off', {
            defaultMessage: 'Performance check: off',
          })}
    </EuiText>
  );
};

/** The dependency graph in a push flyout, leaving the notebook usable beside it. */
export const GraphFlyout = ({
  onClose,
  onSelectCell,
}: {
  onClose: () => void;
  onSelectCell: (cellId: string | undefined) => void;
}) => (
  <NotebookFlyout
    type="push"
    ownFocus={false}
    paddingSize="none"
    onClose={onClose}
    aria-label={i18n.translate('xpack.notebook.graph.ariaLabel', {
      defaultMessage: 'Dependency graph',
    })}
    data-test-subj="notebookGraphFlyout"
  >
    <PerformanceCheckStatus />
    <div css={{ flex: 1, minHeight: 0 }}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyDependencyGraph onSelectCell={onSelectCell} />
      </Suspense>
    </div>
  </NotebookFlyout>
);
