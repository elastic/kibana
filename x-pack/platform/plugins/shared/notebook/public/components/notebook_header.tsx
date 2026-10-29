/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import useObservable from 'react-use/lib/useObservable';
import type { InputCellDefinition } from '../../common/types';
import { useNotebook } from './notebook_context';

const PinnedTimePicker = ({ cell }: { cell: InputCellDefinition }) => {
  const { store } = useNotebook();
  const inputValues = useStateFromPublishingSubject(store.inputValues$);
  const value = inputValues[cell.id];
  if (value?.kind !== 'time') return null;

  return (
    <EuiSuperDatePicker
      compressed
      width="auto"
      start={value.range.from}
      end={value.range.to}
      showUpdateButton={false}
      onTimeChange={({ start, end }) =>
        store.setInputValue(cell.id, { kind: 'time', range: { from: start, to: end } })
      }
      data-test-subj="notebookTimePicker"
    />
  );
};

export const NotebookHeader = ({
  onSave,
  isSaving,
}: {
  onSave?: () => void;
  isSaving?: boolean;
}) => {
  const { store, scheduler } = useNotebook();
  const title = useStateFromPublishingSubject(store.title$);
  const cells = useStateFromPublishingSubject(store.cells$);
  const isDirty = useObservable(store.isDirty$, false);
  const pinnedTime = Object.values(cells).find(
    (cell): cell is InputCellDefinition =>
      cell.type === 'input' && cell.input.kind === 'time' && cell.input.pinned === true
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
      <EuiFlexItem grow css={{ minWidth: 240 }}>
        <EuiInlineEditTitle
          heading="h1"
          size="m"
          inputAriaLabel={i18n.translate('xpack.notebook.header.titleAriaLabel', {
            defaultMessage: 'Notebook title',
          })}
          defaultValue={title}
          onSave={(next) => store.setTitle(next)}
          data-test-subj="notebookTitle"
        />
      </EuiFlexItem>
      {isDirty && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning" data-test-subj="notebookDirty">
            {i18n.translate('xpack.notebook.header.unsaved', {
              defaultMessage: 'Unsaved changes',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {pinnedTime && (
        <EuiFlexItem grow={false}>
          <PinnedTimePicker cell={pinnedTime} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="refresh"
          onClick={() => scheduler.refresh()}
          data-test-subj="notebookRefresh"
        >
          {i18n.translate('xpack.notebook.header.refresh', { defaultMessage: 'Refresh' })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="play"
          onClick={() => scheduler.runAll()}
          data-test-subj="notebookRunAll"
        >
          {i18n.translate('xpack.notebook.header.runAll', { defaultMessage: 'Run all' })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {onSave && (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            iconType="save"
            onClick={onSave}
            isLoading={isSaving}
            isDisabled={!isDirty}
            data-test-subj="notebookSave"
          >
            {i18n.translate('xpack.notebook.header.save', { defaultMessage: 'Save' })}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
