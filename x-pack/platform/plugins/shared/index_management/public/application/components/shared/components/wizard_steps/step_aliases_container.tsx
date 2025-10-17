/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Forms } from '../../../../../shared_imports';
import type { CommonWizardSteps } from './types';
import { StepAliases } from './step_aliases';

interface Props {
  esDocsBase: string;
}

export const StepAliasesContainer: React.FunctionComponent<Props> = ({ esDocsBase }) => {
  const { defaultValue, updateContent } = Forms.useContent<CommonWizardSteps, 'aliases'>('aliases');

  return (
    <StepAliases defaultValue={defaultValue} onChange={updateContent} esDocsBase={esDocsBase} />
  );
};
