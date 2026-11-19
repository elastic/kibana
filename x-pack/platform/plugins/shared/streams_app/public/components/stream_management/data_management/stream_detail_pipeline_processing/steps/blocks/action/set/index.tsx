/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle } from '../ignore_toggles';
import { IgnoreEmptyValueField, OverrideField } from './set_optional_fields';
import { SetValueOrCopyFromField } from './set_value_or_copy_from_field';

export const SetProcessorForm = () => {
  return (
    <>
      <ProcessorFieldSelector fieldKey="field" helpText="" />
      <SetValueOrCopyFromField />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <OverrideField />
        <IgnoreEmptyValueField />
        {/* Media type only applies to Mustache-rendered template snippets. */}
        {/* <MediaTypeField />*/}
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
    </>
  );
};
