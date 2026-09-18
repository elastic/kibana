/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, MouseEvent } from 'react';
import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { DatasetSettingDefaultHintsProvider } from '../create_dataset_flyout/dataset_settings_default_hints';
import { DatasetSettingsField } from '../create_dataset_flyout/dataset_settings_field';
import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from '../create_dataset_flyout/create_dataset_flyout_form_state';
import {
  isFieldVisibleForErrorMode,
  isFieldVisibleForFormat,
} from '../create_dataset_flyout/dataset_settings_visibility';
import { isKnownDatasetFormat } from './use_dataset_format_selection';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';

const equalHeightFlexItemCss = css`
  display: flex;
  min-width: 0;
`;

/** Match paired checkable card heights when one card grows (e.g. expanded advanced settings). */
const fullWidthCardCss = css`
  width: 100%;
  height: 100%;

  .euiCheckableCard__label {
    align-items: flex-start;
  }
`;

export interface SchemaInferenceModeCardsProps {
  control: Control<DatasetWizardFormValues>;
  format: DatasetFormatFormValue;
  errorMode?: DatasetErrorModeFormValue;
}

export const SchemaInferenceModeCards: FunctionComponent<SchemaInferenceModeCardsProps> = ({
  control,
  format,
  errorMode = '',
}) => {
  const { euiTheme } = useEuiTheme();
  const { field } = useController({
    control,
    name: 'dynamic_fields_enabled',
  });
  const isInferSchema = field.value !== false;
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const groupName = useGeneratedHtmlId({ prefix: 'datasetWizardSchemaInferenceMode' });
  const inferCardId = useGeneratedHtmlId({ prefix: 'datasetWizardSchemaInferenceInfer' });
  const manualCardId = useGeneratedHtmlId({ prefix: 'datasetWizardSchemaInferenceManual' });
  const legend = datasetWizardStrings.schemaInferenceModeLegend();

  const showSchemaResolutionField = useMemo(
    () =>
      isKnownDatasetFormat(format) &&
      isFieldVisibleForFormat('schema_resolution', format) &&
      isFieldVisibleForErrorMode('schema_resolution', errorMode),
    [errorMode, format]
  );

  const cardTitleCss = css`
    font-weight: ${euiTheme.font.weight.medium};
  `;

  const cardDescriptionCss = css`
    margin-block: 0;
  `;

  const cardLabelContentCss = useMemo(
    () => css`
      display: flex;
      flex-direction: column;
      gap: ${euiTheme.size.xxs};
      min-width: 0;
      width: 100%;
    `,
    [euiTheme.size.xxs]
  );

  const advancedSettingsToggleCss = useMemo(
    () => css`
      align-self: flex-start;
      font-weight: ${euiTheme.font.weight.medium};
    `,
    [euiTheme.font.weight.medium]
  );

  const schemaResolutionFieldsId = useGeneratedHtmlId({
    prefix: 'datasetWizardSchemaResolutionFields',
  });

  const advancedSettingsFieldCss = css`
    width: 100%;
  `;

  const stopCardSelection = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const toggleAdvancedSettings = (event: MouseEvent) => {
    stopCardSelection(event);
    setIsAdvancedSettingsOpen((open) => !open);
  };

  const renderInferCardAdvancedSettings = () => {
    if (!showSchemaResolutionField) {
      return null;
    }

    return (
      <>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          css={advancedSettingsToggleCss}
          flush="left"
          size="xs"
          iconType={isAdvancedSettingsOpen ? 'arrowDown' : 'arrowRight'}
          iconSide="right"
          aria-expanded={isAdvancedSettingsOpen}
          aria-controls={schemaResolutionFieldsId}
          onClick={toggleAdvancedSettings}
          data-test-subj="datasetWizardSchemaInferenceAdvancedSettingsToggle"
        >
          {datasetWizardStrings.schemaInferenceAdvancedSettingsToggle()}
        </EuiButtonEmpty>
        {isAdvancedSettingsOpen ? (
          <fieldset
            id={schemaResolutionFieldsId}
            css={advancedSettingsFieldCss}
            data-test-subj="datasetWizardSchemaInferenceAdvancedSettingsFields"
          >
            <DatasetSettingDefaultHintsProvider format={format} isEnabled>
              <DatasetSettingsField
                control={control}
                fieldId="schema_resolution"
                testSubjPrefix="datasetWizard"
                variant="step"
                compressed
                hideLabel
                inlineDescriptionTip
                disabled={!isInferSchema}
              />
            </DatasetSettingDefaultHintsProvider>
          </fieldset>
        ) : null}
      </>
    );
  };

  const renderCardLabel = (title: string, description: string, includeAdvancedSettings: boolean) => (
    <div css={cardLabelContentCss}>
      <span css={cardTitleCss}>{title}</span>
      <EuiText size="s" color="subdued">
        <p css={cardDescriptionCss}>{description}</p>
      </EuiText>
      {includeAdvancedSettings ? renderInferCardAdvancedSettings() : null}
    </div>
  );

  return (
    <fieldset aria-label={legend} data-test-subj="datasetWizardSchemaInferenceModeCards">
      <legend className="euiScreenReaderOnly">{legend}</legend>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="stretch">
        <EuiFlexItem css={equalHeightFlexItemCss}>
          <EuiCheckableCard
            id={inferCardId}
            name={groupName}
            css={fullWidthCardCss}
            checkableType="radio"
            checked={isInferSchema}
            onChange={() => field.onChange(true)}
            data-test-subj="datasetWizardSchemaInferenceModeInfer"
            label={renderCardLabel(
              datasetWizardStrings.schemaInferenceModeInferLabel(),
              datasetWizardStrings.schemaInferenceModeInferDescription(),
              true
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem css={equalHeightFlexItemCss}>
          <EuiCheckableCard
            id={manualCardId}
            name={groupName}
            css={fullWidthCardCss}
            checkableType="radio"
            checked={!isInferSchema}
            onChange={() => field.onChange(false)}
            data-test-subj="datasetWizardSchemaInferenceModeManual"
            label={renderCardLabel(
              datasetWizardStrings.schemaInferenceModeManualLabel(),
              datasetWizardStrings.schemaInferenceModeManualDescription(),
              false
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </fieldset>
  );
};
