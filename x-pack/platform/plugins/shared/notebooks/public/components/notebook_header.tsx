/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { findPinnedTimeCell } from '../model/cell_factory';
import { useNotebook } from './notebook_context';
import { NotebookSettingsFlyout } from './notebook_settings_flyout';

const PinnedTimePicker = ({ cell }: { cell: InputCellDefinition }) => {
  const { store, scheduler } = useNotebook();
  const inputValues = useStateFromPublishingSubject(store.inputValues$);
  const value = inputValues[cell.id];
  if (value?.kind !== 'time') return null;

  return (
    <EuiSuperDatePicker
      compressed
      width="auto"
      start={value.range.from}
      end={value.range.to}
      onTimeChange={({ start, end }) =>
        store.setInputValue(cell.id, { kind: 'time', range: { from: start, to: end } })
      }
      onRefresh={() => scheduler.refresh()}
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
  const pinnedTime = findPinnedTimeCell(cells);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
          iconType="play"
          onClick={() => scheduler.runAll()}
          data-test-subj="notebookRunAll"
        >
          {i18n.translate('xpack.notebook.header.runAll', { defaultMessage: 'Run all' })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="gear"
          onClick={() => setIsSettingsOpen(true)}
          data-test-subj="notebookSettings"
        >
          {i18n.translate('xpack.notebook.header.settings', { defaultMessage: 'Settings' })}
        </EuiButtonEmpty>
        {isSettingsOpen && <NotebookSettingsFlyout onClose={() => setIsSettingsOpen(false)} />}
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
