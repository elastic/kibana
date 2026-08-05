/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import type {
  CreateDatasetFormValues,
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { DatasetSettingsField } from './dataset_settings_field';
import type { DatasetSettingsAccordionId, DatasetSettingsFieldId } from './dataset_settings_visibility';
import {
  getVisibleAccordionsForFormat,
  getVisibleFieldsForAccordion,
} from './dataset_settings_visibility';

const accordionButtonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

interface DatasetSettingsAccordionItemProps {
  accordionDomId: string;
  testSubj: string;
  title: string;
  control: Control<CreateDatasetFormValues>;
  fields: DatasetSettingsFieldId[];
  testSubjPrefix: string;
}

const DatasetSettingsAccordionItem: FunctionComponent<DatasetSettingsAccordionItemProps> = ({
  accordionDomId,
  testSubj,
  title,
  control,
  fields,
  testSubjPrefix,
}) => {
  const accordionRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback((isOpen: boolean) => {
    if (!isOpen || !accordionRef.current) {
      return;
    }

    const element = accordionRef.current;

    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  return (
    <div ref={accordionRef}>
      <EuiAccordion
        id={accordionDomId}
        element="fieldset"
        borders="horizontal"
        buttonProps={{ paddingSize: 'm', css: accordionButtonCss }}
        buttonContent={
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        }
        data-test-subj={testSubj}
        initialIsOpen={false}
        paddingSize="none"
        onToggle={handleToggle}
      >
        <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
          {fields.map((fieldId) => (
            <DatasetSettingsField
              key={fieldId}
              control={control}
              fieldId={fieldId}
              testSubjPrefix={testSubjPrefix}
            />
          ))}
        </EuiPanel>
      </EuiAccordion>
    </div>
  );
};

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
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;
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
      <div data-test-subj={`${testSubjPrefix}SettingsAccordions`}>
        {visibleAccordions.map((accordionId) => (
          <DatasetSettingsAccordionItem
            key={accordionId}
            accordionDomId={accordionIds[accordionId]}
            testSubj={`${testSubjPrefix}${ACCORDION_TEST_SUBJ[accordionId]}`}
            title={accordionTitles[accordionId]}
            control={control}
            fields={getVisibleFieldsForAccordion(accordionId, format, errorMode)}
            testSubjPrefix={testSubjPrefix}
          />
        ))}
      </div>
    </>
  );
};
