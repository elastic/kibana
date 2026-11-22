/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiComboBox, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import { useGetTags } from '../../../../containers/use_get_tags';
import { BulkDialog } from './bulk_dialog';
import * as i18n from './translations';

const toOption = (label: string): EuiComboBoxOptionOption<string> => ({ label });

export interface BulkTagsDialogProps {
  count: number;
  /** Called with the tags to add to every selected investigation. */
  onConfirm: (tags: string[]) => void;
  onClose: () => void;
}

/** Picks existing Cases tags, or types new ones, to add to every selected investigation. */
export const BulkTagsDialog: React.FC<BulkTagsDialogProps> = ({ count, onConfirm, onClose }) => {
  const { data: knownTags, isLoading } = useGetTags();
  const [tags, setTags] = useState<string[]>([]);
  const [showError, setShowError] = useState(false);

  const options = useMemo(() => (knownTags ?? []).map(toOption), [knownTags]);
  const tooLong = tags.some((tag) => tag.length > INVESTIGATION_LIMITS.maxTagLength);
  const error = tooLong
    ? i18n.TAG_TOO_LONG(INVESTIGATION_LIMITS.maxTagLength)
    : showError && tags.length === 0
    ? i18n.TAGS_REQUIRED
    : undefined;

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed.length > 0 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
  };

  const confirm = () => {
    if (tags.length === 0) {
      setShowError(true);
      return;
    }
    onConfirm(tags);
  };

  return (
    <BulkDialog
      title={i18n.TAGS_TITLE}
      confirmLabel={i18n.TAGS_CONFIRM}
      isConfirmDisabled={tooLong}
      onConfirm={confirm}
      onClose={onClose}
      data-test-subj="investigationBulkTags"
    >
      <EuiText size="s">
        <p>{i18n.TAGS_BODY(count)}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.TAGS_LABEL} fullWidth isInvalid={error !== undefined} error={error}>
        <EuiComboBox
          fullWidth
          isLoading={isLoading}
          placeholder={i18n.TAGS_PLACEHOLDER}
          options={options}
          selectedOptions={tags.map(toOption)}
          onCreateOption={addTag}
          onChange={(selected) => setTags(selected.map(({ label }) => label))}
          isInvalid={error !== undefined}
          aria-label={i18n.TAGS_LABEL}
          data-test-subj="investigationBulkTagsInput"
        />
      </EuiFormRow>
    </BulkDialog>
  );
};
BulkTagsDialog.displayName = 'BulkTagsDialog';
