/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Forms } from '../../../../shared_imports';
import { documentationService } from '../../../services/documentation';
import type { WizardContent } from '../template_form';
import { StepComponents } from './step_components';

export const StepComponentContainer = () => {
  const { defaultValue, updateContent } = Forms.useContent<WizardContent, 'components'>(
    'components'
  );

  return (
    <StepComponents
      defaultValue={defaultValue}
      onChange={updateContent}
      esDocsBase={documentationService.getEsDocsBase()}
    />
  );
};
