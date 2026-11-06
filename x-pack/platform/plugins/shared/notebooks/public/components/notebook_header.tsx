/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSuperUpdateButton,
  EuiText,
  EuiTextArea,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { filter, skip } from 'rxjs';
import type { AppMenuConfig } from '@kbn/app-menu';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import useObservable from 'react-use/lib/useObservable';
import { MAX_DESCRIPTION_LENGTH } from '../../common/constants';
import type { InputCellDefinition } from '../../common/types';
import { findPinnedTimeCell } from '../model/cell_factory';
import { buildGraph, getDescendants } from '../model/graph';
import { useNotebookServices } from '../services';
import { getCellElementId } from './cell_display';
import { flashWhenInView } from './focus_flash';
import { useNotebook, type SidePanel } from './notebook_context';
import { NotebookSettingsFlyout } from './notebook_settings_flyout';
import { RunAllButton } from './run_all_button';

const REFRESH_TOOLTIP = i18n.translate('xpack.notebook.header.refreshTooltip', {
  defaultMessage: 'Run all cells that use the global time range',
});

const NO_DEPENDENTS_TOOLTIP = i18n.translate('xpack.notebook.header.refreshNoDependentsTooltip', {
  defaultMessage: 'No cells use the global time range',
});

/** Whether any cell uses the time input, and its Refresh tooltip. */
export const useTimeRefresh = (cellId: string): { hasDependents: boolean; tooltip: string } => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const hasDependents = useMemo(
    () => getDescendants(buildGraph(cells, cellOrder), [cellId]).size > 0,
    [cells, cellOrder, cellId]
  );
  return { hasDependents, tooltip: hasDependents ? REFRESH_TOOLTIP : NO_DEPENDENTS_TOOLTIP };
};

export const PinnedTimePicker = ({ cell }: { cell: InputCellDefinition }) => {
  const { store, scheduler } = useNotebook();
  const inputValues = useStateFromPublishingSubject(store.inputValues$);
  const { hasDependents, tooltip } = useTimeRefresh(cell.id);
  const value = inputValues[cell.id];
  if (value?.kind !== 'time') return null;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          compressed
          width="auto"
          start={value.range.from}
          end={value.range.to}
          onTimeChange={({ start, end }) =>
            store.setInputValue(cell.id, { kind: 'time', range: { from: start, to: end } })
          }
          showUpdateButton={false}
          data-test-subj="notebookTimePicker"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSuperUpdateButton
          iconOnly
          size="s"
          isDisabled={!hasDependents}
          onClick={() => scheduler.refresh([cell.id])}
          toolTipProps={{ content: tooltip }}
          data-test-subj="notebookTimePickerRefresh"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/** The header's time picker, which stands in for the pinned time cell when the graph reveals it. */
const RevealableTimePicker = ({ cell }: { cell: InputCellDefinition }) => {
  const { focusedCell$ } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const ref = useRef<HTMLDivElement>(null);
  const glowRef = useRef('');
  glowRef.current = transparentize(euiTheme.colors.primary, 0.6);

  useEffect(() => {
    let stopWaiting: (() => void) | undefined;
    // Skip the current value so a re-subscription doesn't replay an old focus.
    const subscription = focusedCell$
      .pipe(
        skip(1),
        filter((cellId) => cellId === cell.id)
      )
      .subscribe(() => {
        const element = ref.current;
        if (!element) return;
        element.focus({ preventScroll: true });
        stopWaiting?.();
        stopWaiting = flashWhenInView(element, () => ({ glow: glowRef.current }));
      });
    return () => {
      subscription.unsubscribe();
      stopWaiting?.();
    };
  }, [focusedCell$, cell.id]);

  return (
    <div
      id={getCellElementId(cell.id)}
      ref={ref}
      tabIndex={-1}
      css={css`
        outline: none;
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <PinnedTimePicker cell={cell} />
    </div>
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
  sidePanel,
  onToggleSidePanel,
  runControlsRef,
}: {
  runControlsRef?: Ref<HTMLDivElement>;
  onSave?: () => void;
  isSaving?: boolean;
  sidePanel: SidePanel | undefined;
  onToggleSidePanel: (panel: SidePanel) => void;
}) => {
  const { store } = useNotebook();
  const { core } = useNotebookServices();
  const title = useStateFromPublishingSubject(store.title$);
  const cells = useStateFromPublishingSubject(store.cells$);
  const isDirty = useObservable(store.isDirty$, false);
  const pinnedTime = findPinnedTimeCell(cells);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const appMenu = useMemo<AppMenuConfig>(
    () => ({
      itemLimit: 4,
      items: [
        {
          id: 'graph',
          order: 2,
          label: i18n.translate('xpack.notebook.header.graph', { defaultMessage: 'Graph' }),
          iconType: 'graphApp',
          testId: 'notebookGraphToggle',
          isSelected: sidePanel === 'graph',
          run: () => onToggleSidePanel('graph'),
        },
        {
          id: 'app',
          order: 3,
          label: i18n.translate('xpack.notebook.header.app', { defaultMessage: 'App' }),
          iconType: 'dashboardApp',
          testId: 'notebookAppToggle',
          isSelected: sidePanel === 'app',
          run: () => onToggleSidePanel('app'),
        },
        {
          id: 'settings',
          order: 4,
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
    [onSave, isSaving, isDirty, sidePanel, onToggleSidePanel]
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
            <RevealableTimePicker cell={pinnedTime} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <div ref={runControlsRef}>
            <RunAllButton />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <NotebookDescription />
    </>
  );
};
