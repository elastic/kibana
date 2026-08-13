/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { configDrivenProcessors } from '..';
import type { ConfigDrivenProcessorType } from '../types';
import { ProcessorFieldSelector } from '../../processor_field_selector';
import { FieldsAccordion } from '../../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../../ignore_toggles';
import { TextField } from './text_field';
import { BooleanField } from './boolean_field';
import { ArrayField } from './array_field';
import type { FieldConfiguration } from '../types';
import { ProcessorConditionEditor } from '../../processor_condition_editor';

export const ConfigDrivenProcessorFields = ({ type }: { type: ConfigDrivenProcessorType }) => {
  const processor = configDrivenProcessors[type];

  // This shouldn't happen.
  if (!processor) {
    return null;
  }

  const optionalFields = processor.fieldConfigurations.filter(
    (fieldConfiguration) => !fieldConfiguration.required
  );
  const hasOptionalContent = optionalFields.length > 0 || processor.fieldOptions.includeCondition;

  return (
    <>
      <ProcessorFieldSelector
        helpText={processor.fieldOptions.fieldHelpText}
        fieldKey={processor.fieldOptions.fieldKey}
      />
      {processor.fieldConfigurations
        .filter((fieldConfiguration) => fieldConfiguration.required)
        .map((fieldConfiguration, id) => (
          <FieldComponentByConfig key={id} fieldConfiguration={fieldConfiguration} />
        ))}
      <EuiSpacer size="m" />
      {hasOptionalContent && (
        <FieldsAccordion>
          {optionalFields.map((fieldConfiguration, id) => (
            <FieldComponentByConfig key={id} fieldConfiguration={fieldConfiguration} />
          ))}
          {processor.fieldOptions.includeCondition && (
            <>
              <EuiSpacer size="m" />
              <ProcessorConditionEditor />
            </>
          )}
        </FieldsAccordion>
      )}
      <EuiSpacer size="m" />
      {processor.fieldOptions.includeIgnoreFailures && <IgnoreFailureToggle />}
      {processor.fieldOptions.includeIgnoreMissing && <IgnoreMissingToggle />}
    </>
  );
};

const FieldComponentByConfig = ({
  fieldConfiguration,
}: {
  fieldConfiguration: FieldConfiguration;
}) => {
  switch (fieldConfiguration.type) {
    case 'string':
      return <TextField fieldConfiguration={fieldConfiguration} />;
    case 'array':
      return <ArrayField fieldConfiguration={fieldConfiguration} />;
    case 'boolean':
      return <BooleanField fieldConfiguration={fieldConfiguration} />;
  }
};
