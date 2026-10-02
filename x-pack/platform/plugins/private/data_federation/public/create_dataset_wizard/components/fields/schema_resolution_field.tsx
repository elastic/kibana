/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCode,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';

import type {
  CreateDatasetFormValues,
  DatasetSchemaResolutionFormValue,
} from '../../create_dataset_form_state';
import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import { DescribedOptionDisplay } from '../described_option_display';

interface SchemaResolutionValue {
  id: Exclude<DatasetSchemaResolutionFormValue, ''>;
  description: string;
  isDefault?: boolean;
}

const DEFAULT_SCHEMA_RESOLUTION: SchemaResolutionValue['id'] = 'first_file_wins';

type SchemaResolutionOption = EuiComboBoxOptionOption<string> & {
  value: SchemaResolutionValue['id'];
  description: string;
  'data-test-subj': string;
};

const renderSchemaResolutionOption = (option: EuiComboBoxOptionOption<string>) => {
  const opt = option as SchemaResolutionOption;
  return (
    <DescribedOptionDisplay
      title={opt.label}
      description={opt.description}
      testSubj={opt['data-test-subj']}
    />
  );
};

const SCHEMA_RESOLUTION_OPTIONS: SchemaResolutionOption[] = [
  {
    value: DEFAULT_SCHEMA_RESOLUTION,
    label: createDatasetWizardStrings.settingsSchemaResolutionFirstFileWins,
    description: createDatasetWizardStrings.settingsSchemaResolutionFirstFileWinsDescription,
    append: <EuiBadge color="hollow">{createDatasetWizardStrings.defaultBadgeLabel}</EuiBadge>,
    'data-test-subj': 'createDatasetWizardSchemaResolutionOption-first_file_wins',
  },
  {
    value: 'strict',
    label: createDatasetWizardStrings.settingsSchemaResolutionStrict,
    description: createDatasetWizardStrings.settingsSchemaResolutionStrictDescription,
    'data-test-subj': 'createDatasetWizardSchemaResolutionOption-strict',
  },
  {
    value: 'union_by_name',
    label: createDatasetWizardStrings.settingsSchemaResolutionUnionByName,
    description: createDatasetWizardStrings.settingsSchemaResolutionUnionByNameDescription,
    'data-test-subj': 'createDatasetWizardSchemaResolutionOption-union_by_name',
  },
];

export const SchemaResolutionField = React.memo(({ isDisabled }: { isDisabled?: boolean }) => {
  const { control } = useFormContext<CreateDatasetFormValues>();
  const { field: schemaResolutionField } = useController({
    name: 'settings.schema_resolution',
    control,
  });

  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = schemaResolutionField.value
    ? SCHEMA_RESOLUTION_OPTIONS.find((o) => o.value === schemaResolutionField.value)
    : undefined;

  const onSchemaResolutionChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const nextSelectedId = (selectedOptions?.[0] as SchemaResolutionOption | undefined)?.value;

      // Empty selection means "unset" so the request uses the API default.
      if (!nextSelectedId) {
        schemaResolutionField.onChange('');
        return;
      }

      schemaResolutionField.onChange(nextSelectedId);
    },
    [schemaResolutionField]
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        // Satisfy a11y linting for non-interactive wrappers with click handlers.
        // Also prevent Enter/Space key events from bubbling up to the parent card.
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
        }
      }}
    >
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType={isOpen ? 'chevronSingleDown' : 'chevronSingleRight'}
        iconSide="right"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          setIsOpen((open) => !open);
        }}
        data-test-subj="createDatasetWizardSchemaResolutionToggle"
      >
        {createDatasetWizardStrings.configureSchemaResolutionOptional}
      </EuiButtonEmpty>

      {isOpen ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiComboBox
                aria-label={createDatasetWizardStrings.settingsSchemaResolutionLabel}
                placeholder={createDatasetWizardStrings.settingsSchemaResolutionPlaceholder}
                singleSelection={{ asPlainText: true }}
                isClearable
                isDisabled={isDisabled}
                rowHeight="auto"
                fullWidth
                options={SCHEMA_RESOLUTION_OPTIONS}
                renderOption={renderSchemaResolutionOption}
                selectedOptions={
                  selectedOption
                    ? [
                        {
                          value: selectedOption.value,
                          label: selectedOption.label,
                        },
                      ]
                    : []
                }
                onChange={onSchemaResolutionChange}
                data-test-subj="createDatasetWizardSchemaResolution"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={createDatasetWizardStrings.settingsSchemaResolutionHelp}
                aria-label={createDatasetWizardStrings.additionalSettingsInfoIconAriaLabel}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <EuiCode>{DEFAULT_SCHEMA_RESOLUTION}</EuiCode>{' '}
            {createDatasetWizardStrings.settingsSchemaResolutionInfo}
          </EuiText>
        </>
      ) : null}
    </div>
  );
});

SchemaResolutionField.displayName = 'SchemaResolutionField';
