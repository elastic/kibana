/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../common/constants';
import { getTextInputHardMaxLength } from '../utils/validate_text_input';

const descriptionHelpText = i18n.translate('xpack.contextEngine.aiIndexDescription.helpText', {
  defaultMessage:
    'Important: This description shapes generated automation workflows and helps agents decide when the index is relevant.',
});

const descriptionPlaceholder = i18n.translate(
  'xpack.contextEngine.aiIndexDescription.placeholder',
  {
    defaultMessage:
      'Describe what this AI index is for and the information its Knowledge Indicators contain. Include example questions they should help answer and any known gaps in that information.',
  }
);

const descriptionAriaLabel = i18n.translate('xpack.contextEngine.aiIndexDescription.ariaLabel', {
  defaultMessage: 'AI index description',
});

interface AiIndexDescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  warning?: string;
  'data-test-subj': string;
}

export const AiIndexDescriptionField = ({
  value,
  onChange,
  error,
  warning,
  'data-test-subj': dataTestSubj,
}: AiIndexDescriptionFieldProps) => (
  <EuiFormRow
    fullWidth
    isInvalid={error !== undefined}
    error={error}
    helpText={error === undefined ? warning ?? descriptionHelpText : undefined}
  >
    <EuiTextArea
      fullWidth
      rows={3}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={getTextInputHardMaxLength(MAX_AI_INDEX_DESCRIPTION_LENGTH)}
      isInvalid={error !== undefined}
      data-test-subj={dataTestSubj}
      placeholder={descriptionPlaceholder}
      aria-label={descriptionAriaLabel}
    />
  </EuiFormRow>
);
