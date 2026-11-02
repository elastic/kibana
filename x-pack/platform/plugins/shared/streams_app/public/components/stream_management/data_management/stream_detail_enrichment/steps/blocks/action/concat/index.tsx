/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { ConcatTargetField } from './concat_target_field';
import { ConcatFromBuilder } from './concat_from_builder';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreMissingToggle, IgnoreFailureToggle } from '../ignore_toggles';

export const ConcatProcessorForm = () => {
  return (
    <>
      <ConcatTargetField />
      <ConcatFromBuilder />
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
