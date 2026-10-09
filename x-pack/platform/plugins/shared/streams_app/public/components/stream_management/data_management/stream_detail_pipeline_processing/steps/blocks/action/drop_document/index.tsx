/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { IgnoreFailureToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';

export const DropProcessorForm = () => {
  return (
    <>
      <ProcessorConditionEditor />
      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
    </>
  );
};
