/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorFieldSelector } from '../processor_field_selector';

export const EnrichProcessorForm = () => {
  return (
    <>
      <ProcessorFieldSelector fieldKey="to" />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreMissingToggle />
      <IgnoreFailureToggle />
    </>
  );
};
