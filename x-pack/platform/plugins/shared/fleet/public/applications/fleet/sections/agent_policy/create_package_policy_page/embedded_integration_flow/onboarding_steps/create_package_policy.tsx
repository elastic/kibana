/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EmbeddedIntegrationStepsLayoutProps } from '../types';
import { CreatePackagePolicySinglePage } from '../../single_page_layout';

export const CreatePackagePolicyFromOnboardingHub: React.FC<EmbeddedIntegrationStepsLayoutProps> = (
  props
) => {
  return (
    <CreatePackagePolicySinglePage
      {...props}
      onAddAgent={props.onNext}
      from="onboarding-hub"
      withHeader={false}
    />
  );
};
