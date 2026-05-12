/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

interface EvaluatorScoreBadgeProps {
  score: number | null | undefined;
  label?: string;
}

const getScoreColor = (score: number): 'success' | 'warning' | 'danger' => {
  if (score >= 0.8) return 'success';
  if (score >= 0.5) return 'warning';
  return 'danger';
};

export const EvaluatorScoreBadge: React.FC<EvaluatorScoreBadgeProps> = ({ score, label }) => {
  if (score == null) {
    return <EuiBadge color="hollow">{'N/A'}</EuiBadge>;
  }

  const color = getScoreColor(score);
  const displayText = label ? `${score.toFixed(2)} (${label})` : score.toFixed(2);

  return <EuiBadge color={color}>{displayText}</EuiBadge>;
};
