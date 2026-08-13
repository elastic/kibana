/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
import { JoinTargetFieldSelector } from './target_field';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import type { JoinFormState } from '../../../../types';
import { ProcessorFieldSelector } from '../processor_field_selector';

export const JoinProcessorForm = () => {
  const { field: separatorField } = useController<JoinFormState, 'separator'>({
    name: 'separator',
  });
  return (
    <>
      <ProcessorFieldSelector fieldKey="field" helpText="" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.joinDelimiterLabel',
          { defaultMessage: 'Delimiter' }
        )}
        fullWidth
      >
        <EuiFieldText {...separatorField} />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <JoinTargetFieldSelector />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
