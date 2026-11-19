/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { labels } from '../../../utils/i18n';
import { SkillReferencedContentFieldArray } from '../../skills/skill_referenced_content_field_array';
import { sanitizeSkillNameInput, type SkillFormData } from '../../skills/skill_form_validation';

interface SkillFormProps {
  control: Control<SkillFormData>;
  toolOptions: Array<{ label: string; value: string }>;
  /**
   * When provided, the Name field is rendered as a disabled static input showing this value.
   * When omitted, the Name field is rendered as an editable Controller-driven input.
   */
  readonlySkillName?: string;
}

export const SkillForm: React.FC<SkillFormProps> = ({
  control,
  toolOptions,
  readonlySkillName,
}) => {
  return (
    <>
      {readonlySkillName !== undefined ? (
        <EuiFormRow label={labels.skills.nameLabel} fullWidth>
          <EuiFieldText value={readonlySkillName} disabled fullWidth />
        </EuiFormRow>
      ) : (
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={labels.skills.nameLabel}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiFieldText
                {...field}
                onChange={(e) => field.onChange(sanitizeSkillNameInput(e.target.value))}
                fullWidth
                isInvalid={!!error}
              />
            </EuiFormRow>
          )}
        />
      )}

      <EuiSpacer size="m" />

      <Controller
        name="description"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={labels.skills.descriptionLabel}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
          >
            <EuiTextArea {...field} fullWidth isInvalid={!!error} rows={3} />
          </EuiFormRow>
        )}
      />

      <Controller
        name="content"
        control={control}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <EuiFormRow
            label={labels.agentSkills.skillDetailInstructionsLabel}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
          >
            <EuiMarkdownEditor
              onChange={onChange}
              value={value ?? ''}
              aria-label={labels.agentSkills.skillDetailInstructionsLabel}
            />
          </EuiFormRow>
        )}
      />

      <EuiSpacer size="m" />

      <SkillReferencedContentFieldArray />

      <EuiSpacer size="m" />

      <EuiAccordion
        id="skillAdvancedOptions"
        buttonContent={labels.agentSkills.advancedOptionsLabel}
      >
        <EuiSpacer size="s" />
        <Controller
          name="tool_ids"
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <EuiFormRow
              label={labels.skills.toolIdsLabel}
              isInvalid={!!error}
              error={error?.message}
              fullWidth
            >
              <EuiComboBox
                isInvalid={!!error}
                fullWidth
                options={toolOptions}
                selectedOptions={value.map((toolId) => ({ label: toolId, value: toolId }))}
                onChange={(selected) => onChange(selected.map((opt) => opt.value as string))}
              />
            </EuiFormRow>
          )}
        />
      </EuiAccordion>
    </>
  );
};
