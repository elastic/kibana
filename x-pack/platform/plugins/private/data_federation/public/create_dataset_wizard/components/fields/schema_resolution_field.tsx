/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';

import type { CreateDatasetFormValues } from '../../create_dataset_form_state';
import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import { DEFAULT_SCHEMA_RESOLUTION, SchemaResolutionSelect } from './schema_resolution_select';

export const SchemaResolutionField = React.memo(({ isDisabled }: { isDisabled?: boolean }) => {
  const { control } = useFormContext<CreateDatasetFormValues>();
  const { field: schemaResolutionField, fieldState: schemaResolutionState } = useController({
    name: 'settings.schema_resolution',
    control,
    rules: {
      // The combo box is disabled outside infer schema mode, where typed text cannot be corrected.
      validate: (_value, { ui, mappings }) =>
        ui.schemaResolutionIsValid === false && mappings.dynamic
          ? createDatasetWizardStrings.comboBoxSelectValidOption
          : true,
    },
  });
  const {
    field: { onChange: setSchemaResolutionIsValid },
  } = useController({ name: 'ui.schemaResolutionIsValid', control });

  // The combo box's typed text does not survive unmounting, so neither should the flag that reflects it.
  useEffect(() => () => setSchemaResolutionIsValid(true), [setSchemaResolutionIsValid]);

  const [isOpen, setIsOpen] = useState(false);

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
          // Collapsing unmounts the combo box, discarding any typed text.
          if (isOpen) setSchemaResolutionIsValid(true);
          setIsOpen(!isOpen);
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
              <EuiFormRow
                fullWidth
                isInvalid={Boolean(schemaResolutionState.error)}
                error={schemaResolutionState.error?.message}
              >
                <SchemaResolutionSelect
                  value={schemaResolutionField.value}
                  onChange={({ value, isValid }) => {
                    schemaResolutionField.onChange(value);
                    setSchemaResolutionIsValid(isValid);
                  }}
                  onBlur={schemaResolutionField.onBlur}
                  isInvalid={Boolean(schemaResolutionState.error)}
                  isDisabled={isDisabled}
                />
              </EuiFormRow>
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
