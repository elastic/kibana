/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { OptionalText } from './common/optional_text';
import { CreateSLOForm } from '../types';
import { maxWidth } from './slo_edit_form';

export function SloEditFormDescriptionSection() {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const sloNameId = useGeneratedHtmlId({ prefix: 'sloName' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'sloDescription' });
  const tagsId = useGeneratedHtmlId({ prefix: 'tags' });

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth }}
      data-test-subj="sloEditFormDescriptionSection"
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            isInvalid={getFieldState('name').invalid}
            label={i18n.translate('xpack.slo.sloEdit.description.sloName', {
              defaultMessage: 'SLO Name',
            })}
          >
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field: { ref, ...field }, fieldState }) => (
                <EuiFieldText
                  {...field}
                  fullWidth
                  isInvalid={fieldState.invalid}
                  id={sloNameId}
                  data-test-subj="sloFormNameInput"
                  placeholder={i18n.translate('xpack.slo.sloEdit.description.sloNamePlaceholder', {
                    defaultMessage: 'Name for the SLO',
                  })}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.slo.sloEdit.description.sloDescription', {
              defaultMessage: 'Description',
            })}
            labelAppend={<OptionalText />}
          >
            <Controller
              name="description"
              defaultValue=""
              control={control}
              rules={{ required: false }}
              render={({ field: { ref, ...field } }) => (
                <EuiTextArea
                  {...field}
                  fullWidth
                  id={descriptionId}
                  data-test-subj="sloFormDescriptionTextArea"
                  placeholder={i18n.translate(
                    'xpack.slo.sloEdit.description.sloDescriptionPlaceholder',
                    {
                      defaultMessage: 'A short description of the SLO',
                    }
                  )}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.slo.sloEdit.tags.label', {
              defaultMessage: 'Tags',
            })}
          >
            <Controller
              name="tags"
              control={control}
              defaultValue={[]}
              rules={{ required: false }}
              render={({ field: { ref, ...field }, fieldState }) => (
                <EuiComboBox
                  {...field}
                  id={tagsId}
                  fullWidth
                  aria-label={i18n.translate('xpack.slo.sloEdit.tags.placeholder', {
                    defaultMessage: 'Add tags',
                  })}
                  placeholder={i18n.translate('xpack.slo.sloEdit.tags.placeholder', {
                    defaultMessage: 'Add tags',
                  })}
                  isInvalid={fieldState.invalid}
                  options={[]}
                  noSuggestions
                  selectedOptions={generateTagOptions(field.value)}
                  onChange={(selected: EuiComboBoxOptionOption[]) => {
                    if (selected.length) {
                      return field.onChange(selected.map((opts) => opts.value));
                    }

                    field.onChange([]);
                  }}
                  onCreateOption={(
                    searchValue: string,
                    options: EuiComboBoxOptionOption[] = []
                  ) => {
                    const normalizedSearchValue = searchValue.trim().toLowerCase();

                    if (!normalizedSearchValue) {
                      return;
                    }
                    const values = field.value ?? [];

                    if (
                      values.findIndex(
                        (tag) => tag.trim().toLowerCase() === normalizedSearchValue
                      ) === -1
                    ) {
                      field.onChange([...values, searchValue]);
                    }
                  }}
                  isClearable
                  data-test-subj="sloEditTagsSelector"
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function generateTagOptions(tags: string[] = []) {
  return tags.map((tag) => ({
    label: tag,
    value: tag,
    'data-test-subj': `${tag}Option`,
  }));
}
