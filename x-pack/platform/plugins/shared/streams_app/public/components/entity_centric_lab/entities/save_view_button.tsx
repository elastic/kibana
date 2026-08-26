/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SavedView, SavedViewState } from './use_saved_views';

/**
 * "Save view" toolbar action for the Latest lab.
 *
 * The saved-views *list* lives in the left navigation, so the page only needs a
 * save affordance:
 *
 *   - No view loaded → the button saves the current state as a new view (name
 *     prompt).
 *   - A view is loaded → the button opens a small modal asking whether to
 *     **update** the loaded view in place or **save as a new** view; when a
 *     loaded view has unsaved changes an "Unsaved changes" badge sits next to
 *     the button.
 *
 * Once saved/updated the view is reflected under "Saved views" in the nav (the
 * nav subscribes to the same localStorage store — see `use_saved_views.ts`).
 */

// Mirror of the cap used in `saved_views_bar.tsx` so a name saved here stays
// within the same bound the nav / bar rely on for layout.
const MAX_VIEW_NAME_LENGTH = 50;

type SaveMode = 'update' | 'new';

interface Props {
  /** Snapshot of the current on-page state, captured when the user saves. */
  readonly currentState: SavedViewState;
  /** The view currently loaded from the nav, if any (enables the "update" path). */
  readonly loadedView?: SavedView;
  /** Whether the loaded view differs from the current on-page state. */
  readonly isModified: boolean;
  /**
   * Update the loaded view in place with the given state. `makeDefault` reflects
   * the "Set as default" toggle: `true` marks it default, `false` clears it if it
   * was the default (no-op otherwise). `storeTime` reflects the "Store time with
   * view" toggle: when `true` the parent captures the current time range.
   */
  readonly onUpdate: (state: SavedViewState, makeDefault: boolean, storeTime: boolean) => void;
  /** Save the given state as a brand-new named view (parent then switches to it). */
  readonly onSaveAsNew: (
    name: string,
    state: SavedViewState,
    makeDefault: boolean,
    storeTime: boolean
  ) => void;
  /** Show the "Set as default" toggle (ElasticOn only). */
  readonly showMakeDefault?: boolean;
  /** Whether the currently loaded view is already the default. */
  readonly isLoadedViewDefault?: boolean;
  /** Render the toolbar button at the compact (32px) height. */
  readonly compact?: boolean;
}

export const SaveViewButton = ({
  currentState,
  loadedView,
  isModified,
  onUpdate,
  onSaveAsNew,
  showMakeDefault = false,
  isLoadedViewDefault = false,
  compact = false,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  // When a view is loaded the modal opens on the update/new choice; default to
  // "update" since the user is editing the view they're looking at.
  const [mode, setMode] = useState<SaveMode>('update');
  const [name, setName] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [storeTime, setStoreTime] = useState(false);
  const titleId = useGeneratedHtmlId({ prefix: 'entityCentricLabSaveViewButtonTitle' });

  const openModal = useCallback(() => {
    setMode(loadedView ? 'update' : 'new');
    // Seed the name for the "save as new" path with a helpful copy suffix when
    // forking a loaded view, else empty.
    setName(loadedView ? `${loadedView.name} (copy)`.slice(0, MAX_VIEW_NAME_LENGTH) : '');
    // Pre-check the toggle when re-saving a view that's already the default so
    // an "update" doesn't silently drop its default status.
    setMakeDefault(Boolean(loadedView) && isLoadedViewDefault);
    // Reflect the loaded view's stored-time preference so an "update" preserves
    // it unless the user flips the toggle.
    setStoreTime(Boolean(loadedView?.state.storeTime));
    setIsOpen(true);
  }, [loadedView, isLoadedViewDefault]);

  const closeModal = useCallback(() => setIsOpen(false), []);

  // If the loaded view disappears while the modal is open (e.g. deleted
  // elsewhere), fall back to the "new" path so the modal stays coherent.
  useEffect(() => {
    if (isOpen && !loadedView && mode === 'update') setMode('new');
  }, [isOpen, loadedView, mode]);

  // Saving as a *new* view can't inherit the loaded view's default flag; reset
  // the toggle when the user flips to that path so it reflects a fresh view.
  useEffect(() => {
    if (isOpen && mode === 'new') setMakeDefault(false);
  }, [isOpen, mode]);

  const handleConfirm = useCallback(() => {
    if (loadedView && mode === 'update') {
      onUpdate(currentState, showMakeDefault && makeDefault, storeTime);
      setIsOpen(false);
      return;
    }
    const trimmed = name.trim().slice(0, MAX_VIEW_NAME_LENGTH);
    if (!trimmed) return;
    onSaveAsNew(trimmed, currentState, showMakeDefault && makeDefault, storeTime);
    setIsOpen(false);
  }, [
    loadedView,
    mode,
    name,
    onUpdate,
    onSaveAsNew,
    currentState,
    showMakeDefault,
    makeDefault,
    storeTime,
  ]);

  const showNameField = !loadedView || mode === 'new';
  const isConfirmDisabled = showNameField && !name.trim();

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {loadedView && isModified ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning" data-test-subj="entityCentricLabSaveViewUnsavedBadge">
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveViewButton.unsaved', {
                defaultMessage: 'Unsaved changes',
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="save"
            size={compact ? 's' : 'm'}
            onClick={openModal}
            data-test-subj="entityCentricLabSaveViewButton"
          >
            {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveViewButton.label', {
              defaultMessage: 'Save view',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isOpen ? (
        <EuiModal
          onClose={closeModal}
          aria-labelledby={titleId}
          maxWidth={420}
          data-test-subj="entityCentricLabSaveViewButtonModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={titleId}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveViewButton.title', {
                defaultMessage: 'Save view',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {loadedView ? (
              <>
                <EuiRadioGroup
                  options={[
                    {
                      id: 'update',
                      label: i18n.translate(
                        'xpack.streams.entityCentricLab.savedViews.saveViewButton.updateOption',
                        {
                          defaultMessage: 'Update "{name}"',
                          values: { name: loadedView.name },
                        }
                      ),
                    },
                    {
                      id: 'new',
                      label: i18n.translate(
                        'xpack.streams.entityCentricLab.savedViews.saveViewButton.newOption',
                        { defaultMessage: 'Save as a new view' }
                      ),
                    },
                  ]}
                  idSelected={mode}
                  onChange={(id) => setMode(id as SaveMode)}
                  name="entityCentricLabSaveViewMode"
                  data-test-subj="entityCentricLabSaveViewModeGroup"
                />
                <EuiSpacer size="m" />
              </>
            ) : (
              <>
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.streams.entityCentricLab.savedViews.saveViewButton.body',
                      {
                        defaultMessage:
                          'Captures the active category, view mode, search, and tag filters. It will appear under Saved views in the left navigation.',
                      }
                    )}
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
              </>
            )}
            {showNameField ? (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.entityCentricLab.savedViews.saveViewButton.nameLabel',
                  { defaultMessage: 'View name' }
                )}
                fullWidth
              >
                <EuiFieldText
                  fullWidth
                  autoFocus
                  maxLength={MAX_VIEW_NAME_LENGTH}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleConfirm();
                  }}
                  placeholder={i18n.translate(
                    'xpack.streams.entityCentricLab.savedViews.saveViewButton.namePlaceholder',
                    { defaultMessage: 'e.g. Prod Europe' }
                  )}
                  data-test-subj="entityCentricLabSaveViewButtonInput"
                />
              </EuiFormRow>
            ) : null}
            {showMakeDefault ? (
              <>
                <EuiSpacer size="m" />
                <EuiSwitch
                  label={i18n.translate(
                    'xpack.streams.entityCentricLab.savedViews.saveViewButton.makeDefault',
                    { defaultMessage: 'Set as default view' }
                  )}
                  checked={makeDefault}
                  onChange={(event) => setMakeDefault(event.target.checked)}
                  data-test-subj="entityCentricLabSaveViewButtonMakeDefault"
                />
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.streams.entityCentricLab.savedViews.saveViewButton.makeDefaultHelp',
                      {
                        defaultMessage:
                          'Opens automatically the first time you visit Infrastructure in a new session.',
                      }
                    )}
                  </p>
                </EuiText>
              </>
            ) : null}
            <EuiSpacer size="m" />
            <EuiSwitch
              label={i18n.translate(
                'xpack.streams.entityCentricLab.savedViews.saveViewButton.storeTime',
                { defaultMessage: 'Store time with view' }
              )}
              checked={storeTime}
              onChange={(event) => setStoreTime(event.target.checked)}
              data-test-subj="entityCentricLabSaveViewButtonStoreTime"
            />
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.streams.entityCentricLab.savedViews.saveViewButton.storeTimeHelp',
                  {
                    defaultMessage:
                      'This changes the time filter to the currently selected time each time the view is loaded.',
                  }
                )}
              </p>
            </EuiText>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveViewButton.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={handleConfirm}
              isDisabled={isConfirmDisabled}
              data-test-subj="entityCentricLabSaveViewButtonConfirm"
            >
              {loadedView && mode === 'update'
                ? i18n.translate(
                    'xpack.streams.entityCentricLab.savedViews.saveViewButton.confirmUpdate',
                    { defaultMessage: 'Update view' }
                  )
                : i18n.translate(
                    'xpack.streams.entityCentricLab.savedViews.saveViewButton.confirm',
                    {
                      defaultMessage: 'Save',
                    }
                  )}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}
    </>
  );
};
