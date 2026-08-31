/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FieldsAccordion } from '../optional_fields_accordion';
import { ProcessorConditionEditor } from '../processor_condition_editor';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { MathExpressionEditor } from './math_expression_editor';
import { MathTargetFieldSelector } from './target_field';

// Intentionally unused in the native ingest-pipeline UI for now. This is parked
// from the copied Streams UI and should be ported once ingest pipelines support
// an equivalent native math processor.
export const MathProcessorForm = () => {
  return (
    <>
      <MathTargetFieldSelector />
      <EuiSpacer size="m" />
      <MathExpressionEditor />
      <EuiSpacer size="m" />
      <FieldsAccordion>
        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </FieldsAccordion>
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};
