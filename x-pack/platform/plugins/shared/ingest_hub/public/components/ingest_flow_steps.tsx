/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSteps } from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui';

type IngestFlowStepStatus = 'current' | 'complete' | 'incomplete' | 'disabled';

export interface IngestFlowStep {
  title: string;
  status?: IngestFlowStepStatus;
  children: React.ReactNode;
}

interface IngestFlowStepsProps {
  steps: IngestFlowStep[];
}

export const IngestFlowSteps: React.FC<IngestFlowStepsProps> = ({ steps }) => {
  const euiSteps: EuiStepProps[] = steps.map((step) => ({
    title: step.title,
    status: step.status,
    children: step.children,
  }));

  return <EuiSteps steps={euiSteps} />;
};
