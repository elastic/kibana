/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { TransformStringTargetField } from './transform_string_optional_fields';

interface TransformStringProcessorFormProps {
  fieldSelectorHelpText: string;
  targetFieldHelpText: string;
}

export const TransformStringProcessorForm = ({
  fieldSelectorHelpText,
  targetFieldHelpText,
}: TransformStringProcessorFormProps) => {
  return (
    <>
      <ProcessorFieldSelector fieldKey="from" helpText={fieldSelectorHelpText} />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <TransformStringTargetField targetFieldHelpText={targetFieldHelpText} />
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
