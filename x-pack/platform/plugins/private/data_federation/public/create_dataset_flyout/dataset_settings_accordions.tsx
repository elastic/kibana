/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { EuiAccordion, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import type { Control } from 'react-hook-form';

import type { CreateDatasetFormValues, DatasetFormatFormValue } from './create_dataset_flyout_form_state';
import { DatasetSettingsField } from './dataset_settings_field';
import type { DatasetSettingsAccordionId } from './dataset_settings_visibility';
import {
  getVisibleAccordionsForFormat,
  getVisibleFieldsForAccordion,
} from './dataset_settings_visibility';

export interface DatasetSettingsAccordionTitles {
  structure: string;
  textParsing: string;
  columns: string;
  errorHandling: string;
  limits: string;
}

const ACCORDION_TEST_SUBJ: Record<DatasetSettingsAccordionId, string> = {
  structure: 'AccordionStructureAndSchema',
  textParsing: 'AccordionTextParsing',
  columns: 'AccordionColumnsAndValues',
  errorHandling: 'AccordionErrorHandling',
  limits: 'AccordionLimitsAndPerformance',
};

const ACCORDION_ID_PREFIX: Record<DatasetSettingsAccordionId, string> = {
  structure: 'datasetSettingsStructureAccordion',
  textParsing: 'datasetSettingsTextParsingAccordion',
  columns: 'datasetSettingsColumnsAccordion',
  errorHandling: 'datasetSettingsErrorHandlingAccordion',
  limits: 'datasetSettingsLimitsAccordion',
};

export interface DatasetSettingsAccordionsProps {
  control: Control<CreateDatasetFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  accordionTitles: DatasetSettingsAccordionTitles;
  testSubjPrefix?: string;
}

export const DatasetSettingsAccordions: FunctionComponent<DatasetSettingsAccordionsProps> = ({
  control,
  format,
  accordionTitles,
  testSubjPrefix = 'datasetWizard',
}) => {
  const visibleAccordions = useMemo(() => getVisibleAccordionsForFormat(format), [format]);

  const structureAccordionId = useGeneratedHtmlId({ prefix: ACCORDION_ID_PREFIX.structure });
  const textParsingAccordionId = useGeneratedHtmlId({ prefix: ACCORDION_ID_PREFIX.textParsing });
  const columnsAccordionId = useGeneratedHtmlId({ prefix: ACCORDION_ID_PREFIX.columns });
  const errorHandlingAccordionId = useGeneratedHtmlId({
    prefix: ACCORDION_ID_PREFIX.errorHandling,
  });
  const limitsAccordionId = useGeneratedHtmlId({ prefix: ACCORDION_ID_PREFIX.limits });

  const accordionIds: Record<DatasetSettingsAccordionId, string> = {
    structure: structureAccordionId,
    textParsing: textParsingAccordionId,
    columns: columnsAccordionId,
    errorHandling: errorHandlingAccordionId,
    limits: limitsAccordionId,
  };

  if (visibleAccordions.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="l" />
      {visibleAccordions.map((accordionId) => {
        const fields = getVisibleFieldsForAccordion(accordionId, format);
        const title = accordionTitles[accordionId];

        return (
          <EuiAccordion
            key={accordionId}
            id={accordionIds[accordionId]}
            data-test-subj={`${testSubjPrefix}${ACCORDION_TEST_SUBJ[accordionId]}`}
            buttonContent={title}
            initialIsOpen={false}
          >
            {fields.map((fieldId) => (
              <React.Fragment key={fieldId}>
                <DatasetSettingsField
                  control={control}
                  fieldId={fieldId}
                  testSubjPrefix={testSubjPrefix}
                />
              </React.Fragment>
            ))}
          </EuiAccordion>
        );
      })}
    </>
  );
};
