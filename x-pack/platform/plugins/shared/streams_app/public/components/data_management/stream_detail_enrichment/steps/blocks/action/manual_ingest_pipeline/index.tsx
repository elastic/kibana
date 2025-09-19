/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { JsonEditor } from './json_editor';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle } from '../ignore_toggles';

export const ManualIngestPipelineProcessorForm = () => {
  return (
    <>
      <JsonEditor />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
    </>
  );
};
