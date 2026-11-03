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
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { InputDefinition } from '../../common/types';

type ConfigurableInput = Extract<InputDefinition, { kind: 'dropdown' | 'range' }>;
type RangeInput = Extract<InputDefinition, { kind: 'range' }>;

const RANGE_FIELD_LABELS = {
  min: i18n.translate('xpack.notebook.inputSettings.rangeMin', { defaultMessage: 'Min' }),
  max: i18n.translate('xpack.notebook.inputSettings.rangeMax', { defaultMessage: 'Max' }),
  step: i18n.translate('xpack.notebook.inputSettings.rangeStep', { defaultMessage: 'Step' }),
} as const;

const getRangeError = ({ min, max, step }: RangeInput): string | undefined => {
  if (min >= max) {
    return i18n.translate('xpack.notebook.inputSettings.rangeOrderError', {
      defaultMessage: 'Min must be less than max.',
    });
  }
  if (step !== undefined && step <= 0) {
    return i18n.translate('xpack.notebook.inputSettings.rangeStepError', {
      defaultMessage: 'Step must be greater than 0.',
    });
  }
  return undefined;
};

const DropdownFields = ({
  draft,
  onChange,
}: {
  draft: Extract<InputDefinition, { kind: 'dropdown' }>;
  onChange: (draft: ConfigurableInput) => void;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.notebook.inputSettings.optionsQuery', {
      defaultMessage: 'Options query (first column)',
    })}
    helpText={i18n.translate('xpack.notebook.inputSettings.optionsQueryHelp', {
      defaultMessage: 'ES|QL; may reference ?_tstart and ?_tend.',
    })}
  >
    <EuiTextArea
      fullWidth
      rows={8}
      value={draft.optionsQuery}
      onChange={(event) => onChange({ ...draft, optionsQuery: event.target.value })}
      css={css`
        font-family: monospace;
      `}
      data-test-subj="notebookInputSettingsOptionsQuery"
    />
  </EuiFormRow>
);

const RangeFields = ({
  draft,
  error,
  onChange,
}: {
  draft: RangeInput;
  error?: string;
  onChange: (draft: ConfigurableInput) => void;
}) => (
  <EuiFormRow fullWidth isInvalid={error !== undefined} error={error}>
    <EuiFlexGroup gutterSize="s">
      {(['min', 'max', 'step'] as const).map((key) => (
        <EuiFlexItem key={key}>
          <EuiFormRow label={RANGE_FIELD_LABELS[key]}>
            <EuiFieldNumber
              value={draft[key] ?? ''}
              isInvalid={error !== undefined}
              onChange={({ target: { value } }) =>
                onChange({
                  ...draft,
                  [key]: key === 'step' && value === '' ? undefined : Number(value),
                })
              }
              data-test-subj={`notebookInputSettings-${key}`}
            />
          </EuiFormRow>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </EuiFormRow>
);

/** Edits an input's definition; changes apply only when the user confirms. */
export const InputSettingsFlyout = ({
  name,
  input,
  onApply,
  onClose,
}: {
  name: string;
  input: ConfigurableInput;
  onApply: (input: ConfigurableInput) => void;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'notebookInputSettings' });
  const [draft, setDraft] = useState<ConfigurableInput>(input);
  const error = draft.kind === 'range' ? getRangeError(draft) : undefined;

  return (
    <EuiFlyout
      ownFocus
      size="s"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="notebookInputSettingsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {i18n.translate('xpack.notebook.inputSettings.title', {
              defaultMessage: 'Edit {name}',
              values: { name },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {draft.kind === 'dropdown' ? (
          <DropdownFields draft={draft} onChange={setDraft} />
        ) : (
          <RangeFields draft={draft} error={error} onChange={setDraft} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.notebook.inputSettings.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={error !== undefined}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
              data-test-subj="notebookInputSettingsApply"
            >
              {i18n.translate('xpack.notebook.inputSettings.apply', { defaultMessage: 'Apply' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
