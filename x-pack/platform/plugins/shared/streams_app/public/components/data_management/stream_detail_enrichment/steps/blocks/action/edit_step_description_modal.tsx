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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiFieldText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';
import { getStepDescription } from './utils';
import {
  ADD_DESCRIPTION_MENU_LABEL,
  DESCRIPTION_FIELD_ARIA_LABEL,
  DESCRIPTION_HELP_TEXT,
  EDIT_DESCRIPTION_MENU_LABEL,
} from './translations';

export interface EditStepDescriptionModalProps {
  step: StreamlangProcessorDefinitionWithUIAttributes;
  onSave: (description: string) => void;
  onCancel: () => void;
}

export const EditStepDescriptionModal: React.FC<EditStepDescriptionModalProps> = ({
  step,
  onSave,
  onCancel,
}) => {
  const { euiTheme } = useEuiTheme();
  const modalHeaderCss = css`
    padding-block-end: ${euiTheme.size.xs};
  `;

  const initialValue = useMemo(() => {
    if (step.description && step.description.trim().length > 0) {
      return step.description;
    }

    return getStepDescription({
      ...step,
      description: undefined,
    });
  }, [step]);

  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    onSave(value);
  };

  const isEditMode = Boolean(step.description?.trim());
  const title = isEditMode ? EDIT_DESCRIPTION_MENU_LABEL : ADD_DESCRIPTION_MENU_LABEL;
  const helpText = DESCRIPTION_HELP_TEXT;

  return (
    <EuiModal onClose={onCancel} maxWidth={600}>
      <EuiModalHeader css={modalHeaderCss}>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          {helpText}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFieldText
          fullWidth
          compressed
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={DESCRIPTION_FIELD_ARIA_LABEL}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate('xpack.streams.enrichment.processor.editDescription.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton onClick={handleSave} fill>
          {title}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
