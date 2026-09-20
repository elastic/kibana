/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { Forms } from '@kbn/es-ui-shared-plugin/public';
import { useFormContext } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import type { DatasetWizardSection } from './types';

const ReviewSection: React.FC<{
  title: string;
  stepId: DatasetWizardSection;
  onEdit: (stepId: DatasetWizardSection) => void;
  children: React.ReactNode;
}> = ({ title, stepId, onEdit, children }) => (
  <>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          onClick={() => onEdit(stepId)}
          data-test-subj={`createDatasetWizardEdit${stepId}`}
        >
          {createDatasetWizardStrings.editButton}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    {children}
  </>
);

const displayValue = (value: string) => value.trim() || createDatasetWizardStrings.notSet;

export function StepReview() {
  const { navigateToStep } = Forms.useFormWizardContext<DatasetWizardSection>();
  const { getValues } = useFormContext<CreateDatasetFormValues>();
  const values = getValues();

  return (
    <div data-test-subj="createDatasetWizardReviewStep">
      <ReviewSection
        title={createDatasetWizardStrings.datasetStepLabel}
        stepId="dataset"
        onEdit={navigateToStep}
      >
        <EuiDescriptionList textStyle="reverse" compressed>
          <EuiDescriptionListTitle>
            {createDatasetWizardStrings.dataSourceLabel}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewDataSource">
            {displayValue(values.data_source)}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>{createDatasetWizardStrings.nameLabel}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewName">
            {displayValue(values.name)}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            {createDatasetWizardStrings.descriptionLabel}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewDescription">
            {displayValue(values.description)}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            {createDatasetWizardStrings.resourceLabel}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewResource">
            {displayValue(values.resource)}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            {createDatasetWizardStrings.settingsFormatLabel}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewFormat">
            {displayValue(values.settings.format)}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            {createDatasetWizardStrings.settingsPartitionDetectionLabel}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewPartitionDetection">
            {displayValue(values.settings.partition_detection)}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </ReviewSection>

      <EuiSpacer size="l" />

      <ReviewSection
        title={createDatasetWizardStrings.additionalStepLabel}
        stepId="settings"
        onEdit={navigateToStep}
      >
        <EuiDescriptionList textStyle="reverse" compressed>
          <EuiDescriptionListTitle>
            {createDatasetWizardStrings.settingsSchemaResolutionLabel}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewSchemaResolution">
            {displayValue(values.settings.schema_resolution)}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            {createDatasetWizardStrings.settingsPartitionPathLabel}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewPartitionPath">
            {displayValue(values.settings.partition_path)}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            {createDatasetWizardStrings.settingsHivePartitioningLabel}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="createDatasetWizardReviewHivePartitioning">
            {displayValue(values.settings.hive_partitioning)}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </ReviewSection>
    </div>
  );
}
