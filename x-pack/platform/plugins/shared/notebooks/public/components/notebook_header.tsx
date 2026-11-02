/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import type { AppMenuConfig } from '@kbn/app-menu';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import useObservable from 'react-use/lib/useObservable';
import { MAX_DESCRIPTION_LENGTH } from '../../common/constants';
import type { InputCellDefinition } from '../../common/types';
import { findPinnedTimeCell } from '../model/cell_factory';
import { useNotebookServices } from '../services';
import { useNotebook } from './notebook_context';
import { NotebookSettingsFlyout } from './notebook_settings_flyout';

const REFRESH_TOOLTIP = i18n.translate('xpack.notebook.header.refreshTooltip', {
  defaultMessage: 'Run all time-dependent cells',
});

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
      showUpdateButton="iconOnly"
      updateButtonProps={{ toolTipProps: { content: REFRESH_TOOLTIP } }}
      data-test-subj="notebookTimePicker"
    />
  );
};

const DESCRIPTION_PLACEHOLDER = i18n.translate('xpack.notebook.header.descriptionPlaceholder', {
  defaultMessage: 'Add a description',
});

const NotebookDescription = () => {
  const { store } = useNotebook();
  const description = useStateFromPublishingSubject(store.description$);
  const [draft, setDraft] = useState<string | null>(null);
  const isCancelled = useRef(false);

  if (draft === null) {
    const startEditing = () => setDraft(description ?? '');
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={startEditing}
        onKeyDown={(event) => event.key === 'Enter' && startEditing()}
        css={{ cursor: 'text', whiteSpace: 'pre-wrap' }}
        data-test-subj="notebookDescription"
      >
        <EuiText size="s" color="subdued">
          {description || DESCRIPTION_PLACEHOLDER}
        </EuiText>
      </div>
    );
  }

  return (
    <EuiTextArea
      autoFocus
      fullWidth
      compressed
      rows={3}
      resize="vertical"
      maxLength={MAX_DESCRIPTION_LENGTH}
      placeholder={DESCRIPTION_PLACEHOLDER}
      aria-label={i18n.translate('xpack.notebook.header.descriptionAriaLabel', {
        defaultMessage: 'Notebook description',
      })}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (!isCancelled.current) store.setDescription(draft.trim());
        isCancelled.current = false;
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        isCancelled.current = true;
        event.currentTarget.blur();
      }}
      data-test-subj="notebookDescriptionInput"
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
  const { core } = useNotebookServices();
  const title = useStateFromPublishingSubject(store.title$);
  const cells = useStateFromPublishingSubject(store.cells$);
  const isDirty = useObservable(store.isDirty$, false);
  const pinnedTime = findPinnedTimeCell(cells);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const appMenu = useMemo<AppMenuConfig>(
    () => ({
      items: [
        {
          id: 'runAll',
          order: 1,
          label: i18n.translate('xpack.notebook.header.runAll', { defaultMessage: 'Run all' }),
          iconType: 'play',
          testId: 'notebookRunAll',
          run: () => scheduler.runAll(),
        },
        {
          id: 'settings',
          order: 2,
          label: i18n.translate('xpack.notebook.header.settings', { defaultMessage: 'Settings' }),
          iconType: 'gear',
          testId: 'notebookSettings',
          run: () => setIsSettingsOpen(true),
        },
      ],
      ...(onSave
        ? {
            primaryActionItem: {
              id: 'save',
              label: i18n.translate('xpack.notebook.header.save', { defaultMessage: 'Save' }),
              iconType: 'save',
              testId: 'notebookSave',
              isLoading: isSaving,
              disableButton: !isDirty,
              run: onSave,
            },
          }
        : {}),
    }),
    [scheduler, onSave, isSaving, isDirty]
  );

  return (
    <>
      <AppMenu setAppMenu={core.chrome.setAppMenu} config={appMenu} />
      {isSettingsOpen && <NotebookSettingsFlyout onClose={() => setIsSettingsOpen(false)} />}
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
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <NotebookDescription />
    </>
  );
};
