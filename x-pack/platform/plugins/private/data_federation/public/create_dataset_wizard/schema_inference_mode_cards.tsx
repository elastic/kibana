/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';

const fullWidthCardCss = css`
  width: 100%;

  .euiCheckableCard__label {
    align-items: flex-start;
  }
`;

export interface SchemaInferenceModeCardsProps {
  control: Control<DatasetWizardFormValues>;
}

export const SchemaInferenceModeCards: FunctionComponent<SchemaInferenceModeCardsProps> = ({
  control,
}) => {
  const { euiTheme } = useEuiTheme();
  const { field } = useController({
    control,
    name: 'dynamic_fields_enabled',
  });
  const isInferSchema = field.value !== false;
  const groupName = useGeneratedHtmlId({ prefix: 'datasetWizardSchemaInferenceMode' });
  const inferCardId = useGeneratedHtmlId({ prefix: 'datasetWizardSchemaInferenceInfer' });
  const manualCardId = useGeneratedHtmlId({ prefix: 'datasetWizardSchemaInferenceManual' });
  const legend = datasetWizardStrings.schemaInferenceModeLegend();

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
    `,
    [euiTheme.size.xxs]
  );

  const renderCardLabel = (title: string, description: string) => (
    <div css={cardLabelContentCss}>
      <span css={cardTitleCss}>{title}</span>
      <EuiText size="s" color="subdued">
        <p css={cardDescriptionCss}>{description}</p>
      </EuiText>
    </div>
  );

  return (
    <fieldset aria-label={legend} data-test-subj="datasetWizardSchemaInferenceModeCards">
      <legend className="euiScreenReaderOnly">{legend}</legend>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
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
              datasetWizardStrings.schemaInferenceModeInferDescription()
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
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
              datasetWizardStrings.schemaInferenceModeManualDescription()
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </fieldset>
  );
};
