/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { GLUE_IAM_POLICY_TEMPLATE } from '../glue_iam_policy_template';

export interface AwsGlueTableSchemaMappingsEditorProps {
  control: Control<DatasetWizardFormValues>;
  dataSourceRegion: string;
}

export const AwsGlueTableSchemaMappingsEditor: FunctionComponent<
  AwsGlueTableSchemaMappingsEditorProps
> = ({ control, dataSourceRegion }) => {
  const permissionsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardGluePermissionsAccordion',
  });

  const { field: glueDatabaseField, fieldState: glueDatabaseFieldState } = useController({
    control,
    name: 'glue_database',
    rules: {
      validate: (value) => (value?.trim() ? true : datasetWizardStrings.glueDatabaseRequired()),
    },
  });

  const { field: glueTableNameField, fieldState: glueTableNameFieldState } = useController({
    control,
    name: 'glue_table_name',
    rules: {
      validate: (value) => (value?.trim() ? true : datasetWizardStrings.glueTableNameRequired()),
    },
  });

  const { field: glueCatalogRegionField } = useController({
    control,
    name: 'glue_catalog_region',
  });

  const { field: glueAwsAccountIdField } = useController({
    control,
    name: 'glue_aws_account_id',
  });

  const catalogRegionPlaceholder = useMemo(() => {
    if (dataSourceRegion.trim()) {
      return dataSourceRegion.trim();
    }

    return datasetWizardStrings.glueCatalogRegionPlaceholder();
  }, [dataSourceRegion]);

  return (
    <div data-test-subj="datasetWizardAwsGlueTableSchemaMappings">
      <EuiCallOut
        title={datasetWizardStrings.schemaMappingAwsGlueCalloutTitle()}
        iconType="info"
        data-test-subj="datasetWizardAwsGlueCallout"
      >
        <p>{datasetWizardStrings.schemaMappingAwsGlueCalloutDescription()}</p>
      </EuiCallOut>

      <EuiSpacer size="l" />

      <EuiForm component="div">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={datasetWizardStrings.glueDatabaseLabel()}
              helpText={datasetWizardStrings.glueDatabaseHelp()}
              fullWidth
              isInvalid={Boolean(glueDatabaseFieldState.error)}
              error={glueDatabaseFieldState.error?.message}
            >
              <EuiFieldText
                data-test-subj="datasetWizardGlueDatabase"
                fullWidth
                isInvalid={Boolean(glueDatabaseFieldState.error)}
                placeholder={datasetWizardStrings.glueDatabasePlaceholder()}
                value={glueDatabaseField.value}
                onChange={(event) => glueDatabaseField.onChange(event.target.value)}
                name={glueDatabaseField.name}
                inputRef={glueDatabaseField.ref}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={datasetWizardStrings.glueTableNameLabel()}
              helpText={datasetWizardStrings.glueTableNameHelp()}
              fullWidth
              isInvalid={Boolean(glueTableNameFieldState.error)}
              error={glueTableNameFieldState.error?.message}
            >
              <EuiFieldText
                data-test-subj="datasetWizardGlueTableName"
                fullWidth
                isInvalid={Boolean(glueTableNameFieldState.error)}
                placeholder={datasetWizardStrings.glueTableNamePlaceholder()}
                value={glueTableNameField.value}
                onChange={(event) => glueTableNameField.onChange(event.target.value)}
                name={glueTableNameField.name}
                inputRef={glueTableNameField.ref}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={datasetWizardStrings.glueCatalogRegionLabel()}
              helpText={datasetWizardStrings.glueCatalogRegionHelp()}
              fullWidth
            >
              <EuiFieldText
                data-test-subj="datasetWizardGlueCatalogRegion"
                fullWidth
                placeholder={catalogRegionPlaceholder}
                value={glueCatalogRegionField.value}
                onChange={(event) => glueCatalogRegionField.onChange(event.target.value)}
                name={glueCatalogRegionField.name}
                inputRef={glueCatalogRegionField.ref}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={datasetWizardStrings.glueAwsAccountIdLabel()}
              helpText={datasetWizardStrings.glueAwsAccountIdHelp()}
              fullWidth
            >
              <EuiFieldText
                data-test-subj="datasetWizardGlueAwsAccountId"
                fullWidth
                placeholder={datasetWizardStrings.glueAwsAccountIdPlaceholder()}
                value={glueAwsAccountIdField.value}
                onChange={(event) => glueAwsAccountIdField.onChange(event.target.value)}
                name={glueAwsAccountIdField.name}
                inputRef={glueAwsAccountIdField.ref}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>

      <EuiSpacer size="l" />

      <EuiAccordion
        id={permissionsAccordionId}
        buttonContent={
          <EuiText size="s">
            <strong>{datasetWizardStrings.gluePermissionsAccordionTitle()}</strong>
            {' — '}
            {datasetWizardStrings.gluePermissionsAccordionDescription()}
          </EuiText>
        }
        initialIsOpen={false}
        paddingSize="m"
        data-test-subj="datasetWizardGluePermissionsAccordion"
      >
        <EuiText size="s" color="subdued">
          <p>{datasetWizardStrings.gluePermissionsIntro()}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" isCopyable data-test-subj="datasetWizardGluePermissionsPolicy">
          {GLUE_IAM_POLICY_TEMPLATE}
        </EuiCodeBlock>
      </EuiAccordion>
    </div>
  );
};
