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
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';
import { getStepDescription } from './utils';

export interface EditStepDescriptionModalProps {
  step: StreamlangProcessorDefinitionWithUIAttributes;
  mode: 'add' | 'edit';
  onSave: (description: string) => void;
  onCancel: () => void;
}

export const EditStepDescriptionModal: React.FC<EditStepDescriptionModalProps> = ({
  step,
  mode,
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
    onSave(value.trim());
  };

  const isEditMode = mode === 'edit';

  const title = isEditMode
    ? i18n.translate('xpack.streams.enrichment.processor.editDescription.title', {
      defaultMessage: 'Edit description',
    })
    : i18n.translate('xpack.streams.enrichment.processor.addDescription.title', {
      defaultMessage: 'Add description',
    });

  const helpText = i18n.translate('xpack.streams.enrichment.processor.editDescription.helpText', {
    defaultMessage:
      'Explain this step, this would override the metadata. If you decide to remove the description, the metadata would appear back.',
  });


  const textAreaAriaLabel = i18n.translate(
    'xpack.streams.enrichment.processor.editDescription.fieldAriaLabel',
    { defaultMessage: 'Processor description' }
  );

  return (
    <EuiModal
      onClose={onCancel}
      maxWidth={600}
    >
      <EuiModalHeader css={modalHeaderCss}>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody >
        <EuiText size="s" color="subdued">
          {helpText}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTextArea
          fullWidth
          resize="none"
          compressed
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={textAreaAriaLabel}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate(
            'xpack.streams.enrichment.processor.editDescription.cancelButtonLabel',
            { defaultMessage: 'Cancel' }
          )}
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleSave}
          fill
        >
          {title}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};



