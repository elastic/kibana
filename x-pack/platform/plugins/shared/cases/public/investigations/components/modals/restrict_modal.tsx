/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
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
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useInvestigationToasts, useUpdateRecord } from '../../hooks';
import { useCurrentActor } from '../proposals/use_current_actor';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

/** Usernames of the POC environment, offered as suggestions next to the people on the record. */
const POC_USERNAMES = [
  'elastic',
  'priya.k',
  'braxton.w',
  'dana.r',
  'marcus.r',
  'aisha.l',
  'jun.t',
  'viewer.v',
] as const;

const MAX_USERNAME_LENGTH = 512;
/** Leaves room for the suggestions list so it does not cover the footer buttons. */
const MIN_BODY_HEIGHT = '23rem';

const toOption = (username: string): EuiComboBoxOptionOption => ({
  label: username,
  key: username,
});

const sameMembers = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((username) => b.includes(username));

/** Limits the investigation to named people. The person editing always stays on the list. */
export const RestrictModal: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const currentUser = useCurrentActor();
  const currentUsername = currentUser?.id ?? null;
  const isRestricted = record.restricted_to.length > 0;

  const [edited, setEdited] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected =
    edited ?? (isRestricted ? record.restricted_to : currentUsername ? [currentUsername] : []);

  const { showSuccess } = useInvestigationToasts();
  const { mutate: save, isLoading: isSaving } = useUpdateRecord(record.id);
  const { mutate: removeRestriction, isLoading: isRemoving } = useUpdateRecord(record.id, {
    successMessage: i18n.RESTRICT_REMOVED,
  });
  const isBusy = isSaving || isRemoving;

  const suggestions = useMemo(() => {
    const participants = record.participants
      .filter((actor) => actor.type === 'user')
      .map((actor) => actor.id);
    const ordered = [
      ...(currentUsername ? [currentUsername] : []),
      ...participants,
      ...POC_USERNAMES,
    ];
    return Array.from(new Set(ordered)).map(toOption);
  }, [record.participants, currentUsername]);

  const onChange = (options: EuiComboBoxOptionOption[]) => {
    const next = options.map(({ label }) => label);
    if (currentUsername && !next.includes(currentUsername)) {
      setError(i18n.RESTRICT_STAY_ON_LIST);
      return;
    }
    setError(null);
    setEdited(next);
  };

  const onCreateOption = (searchValue: string) => {
    const username = searchValue.trim();
    if (username.length === 0 || selected.includes(username)) {
      return;
    }
    if (username.length > MAX_USERNAME_LENGTH) {
      setError(i18n.RESTRICT_USERNAME_TOO_LONG);
      return;
    }
    setError(null);
    setEdited([...selected, username]);
  };

  const keepsCurrentUser = currentUsername !== null && selected.includes(currentUsername);
  const isTooMany = selected.length > INVESTIGATION_LIMITS.maxRestrictedTo;
  const isUnchanged = isRestricted && sameMembers(selected, record.restricted_to);
  const canSave = keepsCurrentUser && !isTooMany && !isUnchanged && !isBusy;

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(560px, 100%);
      `}
      data-test-subj="investigationRestrictModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.RESTRICT_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody
        css={css`
          min-height: ${MIN_BODY_HEIGHT};
        `}
      >
        <EuiText size="s" data-test-subj="investigationRestrictIntro">
          <p>
            {i18n.RESTRICT_INTRO} <strong>{i18n.RESTRICT_CASES_WARNING}</strong>
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.RESTRICT_PEOPLE_LABEL}
          helpText={i18n.RESTRICT_PEOPLE_HELP}
          isInvalid={error !== null || (currentUsername !== null && !keepsCurrentUser)}
          error={error ?? i18n.RESTRICT_STAY_ON_LIST}
          fullWidth
        >
          <EuiComboBox
            fullWidth
            aria-label={i18n.RESTRICT_PEOPLE_LABEL}
            placeholder={i18n.RESTRICT_PEOPLE_PLACEHOLDER}
            options={suggestions}
            selectedOptions={selected.map(toOption)}
            onChange={onChange}
            onCreateOption={onCreateOption}
            isClearable={false}
            isInvalid={error !== null || (currentUsername !== null && !keepsCurrentUser)}
            data-test-subj="investigationRestrictPeople"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p>{i18n.RESTRICT_EFFECT}</p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {isRestricted ? (
              <EuiButtonEmpty
                color="danger"
                isLoading={isRemoving}
                isDisabled={isBusy}
                onClick={() => removeRestriction({ restricted_to: [] }, { onSuccess: onClose })}
                data-test-subj="investigationRestrictRemove"
              >
                {i18n.RESTRICT_REMOVE}
              </EuiButtonEmpty>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose} isDisabled={isBusy}>
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isLoading={isSaving}
                  isDisabled={!canSave}
                  onClick={() =>
                    save(
                      { restricted_to: selected },
                      {
                        onSuccess: () => {
                          showSuccess(i18n.RESTRICT_SAVED(selected.length));
                          onClose();
                        },
                      }
                    )
                  }
                  data-test-subj="investigationRestrictSave"
                >
                  {i18n.RESTRICT_SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
RestrictModal.displayName = 'RestrictModal';
