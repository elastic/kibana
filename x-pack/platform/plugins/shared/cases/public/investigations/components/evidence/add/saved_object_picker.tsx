/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { getHttpErrorMessage } from '../../../hooks/errors';
import { ICONS } from '../../../icons';
import type { SavedObjectChoice } from '../evidence_api';
import * as i18n from '../translations';

export interface SavedObjectPickerProps {
  label: string;
  choices: SavedObjectChoice[] | undefined;
  isLoading: boolean;
  error: unknown;
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
  validationError?: string;
}

/** A searchable single-choice list of saved objects. */
export const SavedObjectPicker: React.FC<SavedObjectPickerProps> = ({
  label,
  choices,
  isLoading,
  error,
  selectedId,
  onSelect,
  validationError,
}) => {
  const { euiTheme } = useEuiTheme();
  const options = useMemo<EuiSelectableOption[]>(
    () =>
      (choices ?? []).map((choice) => ({
        key: choice.id,
        label: choice.title,
        checked: choice.id === selectedId ? 'on' : undefined,
        append: choice.description ? (
          <EuiText size="xs" color="subdued">
            {choice.description.slice(0, 60)}
          </EuiText>
        ) : undefined,
        'data-test-subj': `investigationEvidenceAddOption-${choice.id}`,
      })),
    [choices, selectedId]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="l" />;
  }
  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType={ICONS.error}
        size="s"
        title={i18n.PICKER_LOAD_ERROR}
        data-test-subj="investigationEvidenceAddPickerError"
        text={getHttpErrorMessage(error)}
      />
    );
  }

  return (
    <EuiFormRow
      label={label}
      isInvalid={Boolean(validationError)}
      error={validationError}
      fullWidth
    >
      <EuiSelectable
        aria-label={label}
        singleSelection="always"
        searchable
        searchProps={{ compressed: true, placeholder: i18n.PICKER_SEARCH_PLACEHOLDER }}
        options={options}
        listProps={{ onFocusBadge: false, rowHeight: euiTheme.base * 2.25 }}
        height={200}
        onChange={(changed) => {
          const checked = changed.find(({ checked: state }) => state === 'on');
          onSelect(checked ? String(checked.key) : undefined);
        }}
        css={css`
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
        `}
        data-test-subj="investigationEvidenceAddPicker"
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiFormRow>
  );
};
SavedObjectPicker.displayName = 'SavedObjectPicker';
