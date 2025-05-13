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
import {
  DateTargetField,
  DateTimezoneField,
  DateOutputFormatField,
  DateLocaleField,
} from './date_optional_fields';
import { DateFormatsField } from './date_formats_field';

export const DateProcessorForm = () => {
  return (
    <>
      <ProcessorFieldSelector />
      <DateFormatsField />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <DateTargetField />
        <DateTimezoneField />
        <DateLocaleField />
        <DateOutputFormatField />
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
    </>
  );
};
