/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SavedViewState } from './use_saved_views';

/**
 * Compact "Save view" toolbar action for the Latest lab.
 *
 * Unlike the full {@link SavedViewsBar} (load dropdown + rename/delete/update),
 * Latest relocates the saved-views *list* into the left navigation, so the page
 * only needs the save affordance: a button that opens a small "name your view"
 * prompt. Once saved, the view appears under "Saved views" in the nav (the nav
 * subscribes to the same localStorage store — see `use_saved_views.ts`).
 */

// Mirror of the cap used in `saved_views_bar.tsx` so a name saved here stays
// within the same bound the nav / bar rely on for layout.
const MAX_VIEW_NAME_LENGTH = 50;

interface Props {
  /** Snapshot of the current on-page state, captured when the user saves. */
  readonly currentState: SavedViewState;
  readonly onSave: (name: string, state: SavedViewState) => void;
}

export const SaveViewButton = ({ currentState, onSave }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const titleId = useGeneratedHtmlId({ prefix: 'entityCentricLabSaveViewButtonTitle' });

  const openModal = useCallback(() => {
    setName('');
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => setIsOpen(false), []);

  const handleSave = useCallback(() => {
    const trimmed = name.trim().slice(0, MAX_VIEW_NAME_LENGTH);
    if (!trimmed) return;
    onSave(trimmed, currentState);
    setIsOpen(false);
  }, [name, onSave, currentState]);

  return (
    <>
      <EuiButton
        iconType="save"
        onClick={openModal}
        data-test-subj="entityCentricLabSaveViewButton"
      >
        {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveViewButton.label', {
          defaultMessage: 'Save view',
        })}
      </EuiButton>

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
                defaultMessage: 'Save current view',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveViewButton.body', {
                  defaultMessage:
                    'Captures the active category, view mode, search, and tag filters. It will appear under Saved views in the left navigation.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
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
                  if (event.key === 'Enter') handleSave();
                }}
                placeholder={i18n.translate(
                  'xpack.streams.entityCentricLab.savedViews.saveViewButton.namePlaceholder',
                  { defaultMessage: 'e.g. Prod Europe' }
                )}
                data-test-subj="entityCentricLabSaveViewButtonInput"
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveViewButton.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={handleSave}
              isDisabled={!name.trim()}
              data-test-subj="entityCentricLabSaveViewButtonConfirm"
            >
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.saveViewButton.confirm', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}
    </>
  );
};
