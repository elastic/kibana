/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
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
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getProfileNameError } from '../../../common/validation';
import type { BoostProfileType } from '../../../common/types';
import { ChangeTable } from '../change_table';
import { getCopyName } from '../copy_name';
import { formatDataSourceCount } from '../format';
import { MODAL_WIDTH } from '../modal_width';
import { TargetName } from '../rules/target_name';
import { PROFILE_NAME_ERROR_MESSAGES, PROFILE_NAME_HELP } from './profile_messages';

const SAVE_LABEL = i18n.translate('xpack.boost.profileChangesModal.saveButton', {
  defaultMessage: 'Save',
});

// Focuses the name once its step opens. A stable callback ref, so it only runs when the input mounts.
const focusOnMount = (element: HTMLInputElement | null) => element?.focus();

/** An index or data stream a profile applies to, through the rule that applies it. */
export interface ProfileDataSource {
  name: string;
  isHidden?: boolean;
  ruleName: string;
}

interface ProfileChangesModalProps {
  profileName: string;
  type: BoostProfileType;
  /** What the profile applies to now, which saving the changes over it changes too. */
  affected: readonly ProfileDataSource[];
  /** Names a new profile can't take. */
  takenNames: readonly string[];
  /** Which way a save is in progress, if one is. */
  savingAs?: 'overwrite' | 'new';
  onOverwrite: () => void;
  onSaveAsNew: (profileName: string) => void;
  onCancel: () => void;
}

/**
 * Confirms saving changes to a profile that applies to indices or data streams, listing them and the
 * rule that applies it to each. The changes can go over the profile, changing all of them, or into a
 * new profile that nothing uses yet, leaving them as they are.
 */
export const ProfileChangesModal = ({
  profileName,
  type,
  affected,
  takenNames,
  savingAs,
  onOverwrite,
  onSaveAsNew,
  onCancel,
}: ProfileChangesModalProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId();
  const formId = useGeneratedHtmlId({ prefix: 'boostSaveAsNewProfile' });
  const [isNaming, setIsNaming] = useState(false);
  const [newName, setNewName] = useState(() => getCopyName(profileName, takenNames));
  const [showsNameError, setShowsNameError] = useState(false);
  const nameError = getProfileNameError(newName, takenNames);
  const isSaving = savingAs !== undefined;

  const saveAsNew = () => {
    if (nameError) {
      setShowsNameError(true);
      return;
    }
    onSaveAsNew(newName);
  };

  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onCancel}
      maxWidth={MODAL_WIDTH}
      // As wide in both steps, so naming the new profile doesn't resize it.
      css={{ inlineSize: MODAL_WIDTH }}
      data-test-subj="boostProfileChangesModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {isNaming
            ? i18n.translate('xpack.boost.profileChangesModal.saveAsNewTitle', {
                defaultMessage: 'Save as new boost profile',
              })
            : i18n.translate('xpack.boost.profileChangesModal.title', {
                defaultMessage: 'Update boost profile "{profileName}"?',
                values: { profileName },
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      {isNaming ? (
        <>
          <EuiModalBody>
            <form
              id={formId}
              onSubmit={(event) => {
                event.preventDefault();
                saveAsNew();
              }}
            >
              <EuiFormRow
                label={i18n.translate('xpack.boost.profileChangesModal.nameLabel', {
                  defaultMessage: 'Profile name',
                })}
                helpText={PROFILE_NAME_HELP}
                isInvalid={showsNameError && Boolean(nameError)}
                error={showsNameError && nameError && PROFILE_NAME_ERROR_MESSAGES[nameError]}
                fullWidth
              >
                <EuiFieldText
                  value={newName}
                  onChange={({ target: { value } }) => setNewName(value)}
                  isInvalid={showsNameError && Boolean(nameError)}
                  disabled={isSaving}
                  fullWidth
                  inputRef={focusOnMount}
                  data-test-subj="boostProfileNewName"
                />
              </EuiFormRow>
            </form>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={() => setIsNaming(false)}
                  flush="left"
                  disabled={isSaving}
                  data-test-subj="boostProfileChangesBack"
                >
                  {i18n.translate('xpack.boost.profileChangesModal.backButton', {
                    defaultMessage: 'Back',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  type="submit"
                  form={formId}
                  fill
                  isLoading={savingAs === 'new'}
                  data-test-subj="boostProfileSaveAsNewConfirm"
                >
                  {SAVE_LABEL}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalFooter>
        </>
      ) : (
        <>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.boost.profileChangesModal.body', {
                  defaultMessage:
                    'This profile applies to {dataSources}, which these changes apply to as well. You may save as a new boost profile to avoid unintended changes.',
                  values: { dataSources: formatDataSourceCount(type, affected.length) },
                })}
              </p>
            </EuiText>
            <EuiSpacer size="l" />
            <EuiPanel hasBorder hasShadow={false} paddingSize="none">
              <ChangeTable
                aria-label={i18n.translate('xpack.boost.profileChangesModal.tableLabel', {
                  defaultMessage:
                    'Data sources the profile applies to, and the rule that applies it',
                })}
                columns={[
                  type === 'data_streams'
                    ? i18n.translate('xpack.boost.profileChangesModal.dataStreamColumn', {
                        defaultMessage: 'Affected data stream',
                      })
                    : i18n.translate('xpack.boost.profileChangesModal.indexColumn', {
                        defaultMessage: 'Affected index',
                      }),
                  i18n.translate('xpack.boost.profileChangesModal.ruleColumn', {
                    defaultMessage: 'Boost rule',
                  }),
                ]}
                rows={affected.map(({ name, isHidden, ruleName }) => ({
                  id: name,
                  cells: [<TargetName key="name" name={name} isHidden={isHidden} />, ruleName],
                }))}
                // Long lists scroll, keeping the modal's buttons in view.
                maxHeight={euiTheme.base * 15}
              />
            </EuiPanel>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onCancel}
                  flush="left"
                  disabled={isSaving}
                  data-test-subj="boostProfileChangesCancel"
                >
                  {i18n.translate('xpack.boost.profileChangesModal.cancelButton', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  {/* Saving over the profile is what the user set out to do, so it's the primary
                    action, and a new profile the alternative. */}
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={() => setIsNaming(true)}
                      disabled={isSaving}
                      data-test-subj="boostProfileSaveAsNew"
                    >
                      {i18n.translate('xpack.boost.profileChangesModal.saveAsNewButton', {
                        defaultMessage: 'Save as new',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={onOverwrite}
                      isLoading={savingAs === 'overwrite'}
                      disabled={isSaving}
                      data-test-subj="boostProfileConfirmSave"
                    >
                      {SAVE_LABEL}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalFooter>
        </>
      )}
    </EuiModal>
  );
};
