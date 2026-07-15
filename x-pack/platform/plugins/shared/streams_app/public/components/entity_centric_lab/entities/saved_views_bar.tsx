/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SavedView, SavedViewState, UseSavedViewsResult } from './use_saved_views';
import { areStatesEqual } from './use_saved_views';

/**
 * Toolbar row that sits above the search / filters row on the entity
 * inventory. Reads/writes go through {@link useSavedViews} (localStorage).
 *
 * Layout:
 *   [ Views ▾ <current-view-name-or-placeholder>  (Modified) ]  …  [ Save view ]
 *
 * "Views ▾" opens a popover listing every saved view (click to load) with
 * per-row rename / update / delete. "Save view" opens a small modal for
 * naming; if a view is currently loaded and the on-page state differs
 * from the saved state, an "Update <view>" button also appears next to
 * "Save view" as the primary action.
 */

const ROW_CSS = css`
  flex-grow: 0;
`;

interface Props {
  /**
   * Snapshot of the *current* on-page state, used to (a) power the
   * "Modified" indicator against the loaded view and (b) capture the
   * payload when the user hits Save / Update.
   */
  readonly currentState: SavedViewState;
  /**
   * Applying a view is up to the host: it may require a route change
   * when `view.state.category` differs from the current category, so
   * this component just hands the caller the whole `SavedView` and
   * lets it decide.
   */
  readonly onApplyView: (view: SavedView) => void;
  readonly savedViews: UseSavedViewsResult;
}

export const SavedViewsBar = ({ currentState, onApplyView, savedViews }: Props) => {
  const {
    views,
    currentView,
    saveView,
    updateViewState,
    renameView,
    deleteView,
    setCurrentViewId,
  } = savedViews;

  const isModified = currentView ? !areStatesEqual(currentView.state, currentState) : false;

  const [loadOpen, setLoadOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [renameTarget, setRenameTarget] = useState<SavedView | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SavedView | null>(null);

  const saveModalTitleId = useGeneratedHtmlId({ prefix: 'entityCentricLabSaveViewTitle' });
  const renameModalTitleId = useGeneratedHtmlId({ prefix: 'entityCentricLabRenameViewTitle' });

  const openSaveModal = useCallback(() => {
    // Seed with the loaded view's name so "Save as" reads naturally
    // ("payments-team hosts (2)"). Empty when nothing is loaded.
    setSaveName(currentView ? `${currentView.name} (copy)` : '');
    setSaveOpen(true);
  }, [currentView]);

  const closeSaveModal = useCallback(() => setSaveOpen(false), []);

  const handleSave = useCallback(() => {
    const name = saveName.trim();
    if (!name) return;
    saveView(name, currentState);
    setSaveOpen(false);
  }, [saveName, saveView, currentState]);

  const handleUpdateCurrent = useCallback(() => {
    if (!currentView) return;
    updateViewState(currentView.id, currentState);
  }, [currentView, updateViewState, currentState]);

  const openRename = useCallback((view: SavedView) => {
    setRenameTarget(view);
    setRenameValue(view.name);
    setLoadOpen(false);
  }, []);

  const closeRename = useCallback(() => setRenameTarget(null), []);

  const handleRename = useCallback(() => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return;
    renameView(renameTarget.id, name);
    setRenameTarget(null);
  }, [renameTarget, renameValue, renameView]);

  const openDelete = useCallback((view: SavedView) => {
    setDeleteTarget(view);
    setLoadOpen(false);
  }, []);

  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteView(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteView]);

  const handleUpdateFromRow = useCallback(
    (view: SavedView) => {
      updateViewState(view.id, currentState);
      setLoadOpen(false);
    },
    [updateViewState, currentState]
  );

  const handleClearCurrent = useCallback(() => {
    setCurrentViewId(null);
  }, [setCurrentViewId]);

  const loadedLabel = useMemo(() => {
    if (currentView) return currentView.name;
    return i18n.translate('xpack.streams.entityCentricLab.savedViews.unsavedLabel', {
      defaultMessage: 'No view loaded',
    });
  }, [currentView]);

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={ROW_CSS}
        data-test-subj="entityCentricLabSavedViewsBar"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.entityCentricLab.savedViews.label', {
              defaultMessage: 'Saved views',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={loadOpen}
            closePopover={() => setLoadOpen(false)}
            anchorPosition="downLeft"
            panelPaddingSize="none"
            button={
              <EuiButtonEmpty
                iconType="arrowDown"
                iconSide="right"
                size="s"
                onClick={() => setLoadOpen((open) => !open)}
                data-test-subj="entityCentricLabSavedViewsLoad"
              >
                {loadedLabel}
              </EuiButtonEmpty>
            }
          >
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.load.title', {
                defaultMessage: 'Load a saved view',
              })}
            </EuiPopoverTitle>
            {views.length === 0 ? (
              <div css={emptyPromptCss}>
                <EuiEmptyPrompt
                  paddingSize="s"
                  titleSize="xxs"
                  iconType="save"
                  title={
                    <h4>
                      {i18n.translate('xpack.streams.entityCentricLab.savedViews.load.emptyTitle', {
                        defaultMessage: 'No saved views yet',
                      })}
                    </h4>
                  }
                  body={
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('xpack.streams.entityCentricLab.savedViews.load.emptyBody', {
                        defaultMessage:
                          'Apply some filters, choose a view mode, then hit Save view to bookmark it here.',
                      })}
                    </EuiText>
                  }
                />
              </div>
            ) : (
              <EuiListGroup gutterSize="none" flush maxWidth={360} css={listGroupCss}>
                {views.map((view) => (
                  <SavedViewRow
                    key={view.id}
                    view={view}
                    isActive={view.id === currentView?.id}
                    onLoad={() => {
                      setLoadOpen(false);
                      onApplyView(view);
                    }}
                    onRename={() => openRename(view)}
                    onDelete={() => openDelete(view)}
                    onUpdateFromCurrent={() => handleUpdateFromRow(view)}
                  />
                ))}
              </EuiListGroup>
            )}
            {currentView ? (
              <EuiPopoverFooter paddingSize="s">
                <EuiButtonEmpty
                  size="xs"
                  iconType="cross"
                  onClick={handleClearCurrent}
                  data-test-subj="entityCentricLabSavedViewsClear"
                >
                  {i18n.translate('xpack.streams.entityCentricLab.savedViews.clearLoaded', {
                    defaultMessage: 'Clear loaded view',
                  })}
                </EuiButtonEmpty>
              </EuiPopoverFooter>
            ) : null}
          </EuiPopover>
        </EuiFlexItem>
        {currentView && isModified ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.streams.entityCentricLab.savedViews.modifiedTooltip', {
                defaultMessage:
                  'The current filters or layout differ from the saved view. Update the view or save as a new one.',
              })}
            >
              <EuiBadge color="warning" data-test-subj="entityCentricLabSavedViewsModifiedBadge">
                {i18n.translate('xpack.streams.entityCentricLab.savedViews.modifiedBadge', {
                  defaultMessage: 'Modified',
                })}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem />
        {currentView && isModified ? (
          <EuiFlexItem grow={false}>
            {/*
              Kept as EuiButtonEmpty so the whole saved-views toolbar row
              stays visually secondary — nothing here should compete with
              the page-level "Manage entity types" button up in the header.
            */}
            <EuiButtonEmpty
              size="s"
              iconType="save"
              onClick={handleUpdateCurrent}
              data-test-subj="entityCentricLabSavedViewsUpdate"
            >
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.updateButton', {
                defaultMessage: 'Update "{name}"',
                values: { name: currentView.name },
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="plusInCircle"
            onClick={openSaveModal}
            data-test-subj="entityCentricLabSavedViewsSave"
          >
            {currentView
              ? i18n.translate('xpack.streams.entityCentricLab.savedViews.saveAsButton', {
                  defaultMessage: 'Save as new view',
                })
              : i18n.translate('xpack.streams.entityCentricLab.savedViews.saveButton', {
                  defaultMessage: 'Save view',
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {saveOpen ? (
        <EuiModal
          onClose={closeSaveModal}
          aria-labelledby={saveModalTitleId}
          maxWidth={420}
          data-test-subj="entityCentricLabSavedViewsSaveModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={saveModalTitleId}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveModal.title', {
                defaultMessage: 'Save current view',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveModal.body', {
                  defaultMessage:
                    'Captures the active category, tab, view mode, search, and tag filters.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.entityCentricLab.savedViews.saveModal.nameLabel',
                { defaultMessage: 'View name' }
              )}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                autoFocus
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSave();
                }}
                placeholder={i18n.translate(
                  'xpack.streams.entityCentricLab.savedViews.saveModal.namePlaceholder',
                  { defaultMessage: 'e.g. payments-team hosts (prod)' }
                )}
                data-test-subj="entityCentricLabSavedViewsSaveInput"
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeSaveModal}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveModal.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={handleSave}
              isDisabled={!saveName.trim()}
              data-test-subj="entityCentricLabSavedViewsSaveConfirm"
            >
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveModal.confirm', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}

      {renameTarget ? (
        <EuiModal
          onClose={closeRename}
          aria-labelledby={renameModalTitleId}
          maxWidth={420}
          data-test-subj="entityCentricLabSavedViewsRenameModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={renameModalTitleId}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.renameModal.title', {
                defaultMessage: 'Rename view',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.entityCentricLab.savedViews.renameModal.nameLabel',
                { defaultMessage: 'View name' }
              )}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleRename();
                }}
                data-test-subj="entityCentricLabSavedViewsRenameInput"
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeRename}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.renameModal.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={handleRename}
              isDisabled={!renameValue.trim() || renameValue.trim() === renameTarget.name}
              data-test-subj="entityCentricLabSavedViewsRenameConfirm"
            >
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.renameModal.confirm', {
                defaultMessage: 'Rename',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}

      {deleteTarget ? (
        <EuiConfirmModal
          title={i18n.translate('xpack.streams.entityCentricLab.savedViews.deleteModal.title', {
            defaultMessage: 'Delete "{name}"?',
            values: { name: deleteTarget.name },
          })}
          onCancel={closeDelete}
          onConfirm={handleDelete}
          cancelButtonText={i18n.translate(
            'xpack.streams.entityCentricLab.savedViews.deleteModal.cancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.entityCentricLab.savedViews.deleteModal.confirm',
            { defaultMessage: 'Delete view' }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="entityCentricLabSavedViewsDeleteModal"
        >
          <p>
            {i18n.translate('xpack.streams.entityCentricLab.savedViews.deleteModal.body', {
              defaultMessage: 'This action cannot be undone.',
            })}
          </p>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// Individual row: title on the left, per-row actions on the right
// ---------------------------------------------------------------------------

interface SavedViewRowProps {
  readonly view: SavedView;
  readonly isActive: boolean;
  readonly onLoad: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
  readonly onUpdateFromCurrent: () => void;
}

const SavedViewRow = ({
  view,
  isActive,
  onLoad,
  onRename,
  onDelete,
  onUpdateFromCurrent,
}: SavedViewRowProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      responsive={false}
      css={rowCss}
      data-test-subj={`entityCentricLabSavedViewRow-${view.id}`}
    >
      <EuiFlexItem>
        <EuiListGroupItem
          label={view.name}
          onClick={onLoad}
          size="s"
          iconType={isActive ? 'check' : 'empty'}
          data-test-subj={`entityCentricLabSavedViewLoad-${view.id}`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={menuOpen}
          closePopover={() => setMenuOpen(false)}
          anchorPosition="downRight"
          panelPaddingSize="none"
          button={
            <EuiButtonIcon
              iconType="boxesHorizontal"
              color="text"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.savedViews.rowActions.ariaLabel',
                { defaultMessage: 'Actions for {name}', values: { name: view.name } }
              )}
              data-test-subj={`entityCentricLabSavedViewActions-${view.id}`}
            />
          }
        >
          <EuiListGroup gutterSize="none" flush maxWidth={220}>
            <EuiListGroupItem
              iconType="save"
              label={i18n.translate('xpack.streams.entityCentricLab.savedViews.rowActions.update', {
                defaultMessage: 'Update with current filters',
              })}
              onClick={() => {
                setMenuOpen(false);
                onUpdateFromCurrent();
              }}
              size="s"
              data-test-subj={`entityCentricLabSavedViewUpdate-${view.id}`}
            />
            <EuiListGroupItem
              iconType="pencil"
              label={i18n.translate('xpack.streams.entityCentricLab.savedViews.rowActions.rename', {
                defaultMessage: 'Rename',
              })}
              onClick={() => {
                setMenuOpen(false);
                onRename();
              }}
              size="s"
              data-test-subj={`entityCentricLabSavedViewRename-${view.id}`}
            />
            <EuiListGroupItem
              iconType="trash"
              label={i18n.translate('xpack.streams.entityCentricLab.savedViews.rowActions.delete', {
                defaultMessage: 'Delete',
              })}
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              size="s"
              data-test-subj={`entityCentricLabSavedViewDelete-${view.id}`}
            />
          </EuiListGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------
//
// Keep the row hover only on the whole strip (not just the label) so the
// per-row "…" button feels associated. The popover panel itself gets a
// minimum width so short view names don't produce a comically narrow
// panel.

const listGroupCss = css`
  min-width: 320px;
`;

const rowCss = css`
  padding: 0 8px;
  &:hover {
    background-color: var(--eui-color-lightest-shade, #f7f8fc);
  }
`;

const emptyPromptCss = css`
  min-width: 280px;
`;
