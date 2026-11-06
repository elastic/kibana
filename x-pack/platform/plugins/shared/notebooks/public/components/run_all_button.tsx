/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiSplitButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellStatus } from '../model/types';
import { useNotebook } from './notebook_context';
import { useCellStatuses } from './use_cell_statuses';

const RUN_ALL_LABEL = i18n.translate('xpack.notebook.header.runAll', {
  defaultMessage: 'Run all',
});

const MORE_OPTIONS_LABEL = i18n.translate('xpack.notebook.header.runOptions', {
  defaultMessage: 'More run options',
});

const STALE: readonly CellStatus[] = ['stale'];
const FAILED: readonly CellStatus[] = ['error', 'blocked'];

/** Runs every cell, with a menu to run only the stale or failed ones. */
export const RunAllButton = () => {
  const { store, scheduler } = useNotebook();
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const statuses = useCellStatuses(cellOrder);
  const [isOpen, setIsOpen] = useState(false);
  const countOf = (wanted: readonly CellStatus[]) =>
    cellOrder.filter((id) => {
      const status = statuses[id];
      return status !== undefined && wanted.includes(status);
    }).length;
  const staleCount = countOf(STALE);
  const failedCount = countOf(FAILED);

  const runWith = (wanted: readonly CellStatus[]) => {
    setIsOpen(false);
    void scheduler.runCellsWithStatus(wanted);
  };

  return (
    <EuiSplitButton size="s" color="primary">
      <EuiSplitButton.ActionPrimary
        iconType="play"
        onClick={() => scheduler.runAll()}
        data-test-subj="notebookRunAll"
      >
        {RUN_ALL_LABEL}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        aria-label={MORE_OPTIONS_LABEL}
        iconType="arrowDown"
        onClick={() => setIsOpen((open) => !open)}
        data-test-subj="notebookRunOptions"
        popoverProps={{
          isOpen,
          closePopover: () => setIsOpen(false),
          panelPaddingSize: 'none',
          anchorPosition: 'downRight',
          children: (
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="runAll"
                  icon="play"
                  onClick={() => {
                    setIsOpen(false);
                    void scheduler.runAll();
                  }}
                >
                  {RUN_ALL_LABEL}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="runStale"
                  icon="refresh"
                  disabled={staleCount === 0}
                  onClick={() => runWith(STALE)}
                  data-test-subj="notebookRunStale"
                >
                  {i18n.translate('xpack.notebook.header.runStale', {
                    defaultMessage: 'Run stale cells ({count})',
                    values: { count: staleCount },
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="runFailed"
                  icon="warning"
                  disabled={failedCount === 0}
                  onClick={() => runWith(FAILED)}
                  data-test-subj="notebookRunFailed"
                >
                  {i18n.translate('xpack.notebook.header.runFailed', {
                    defaultMessage: 'Retry failed cells ({count})',
                    values: { count: failedCount },
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          ),
        }}
      />
    </EuiSplitButton>
  );
};
