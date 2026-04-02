/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

type EvaluatorKind = 'LLM' | 'CODE';

interface EvaluatorKindBadgeProps {
  kind: EvaluatorKind;
}

const KIND_CONFIG: Record<EvaluatorKind, { label: string; color: 'accent' | 'primary' }> = {
  LLM: { label: 'LLM', color: 'accent' },
  CODE: { label: 'CODE', color: 'primary' },
};

export const EvaluatorKindBadge: React.FC<EvaluatorKindBadgeProps> = ({ kind }) => {
  const config = KIND_CONFIG[kind];

  return <EuiBadge color={config.color}>{config.label}</EuiBadge>;
};
