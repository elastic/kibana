/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';

interface EvaluatorBadgesGroupProps {
  relevance: number;
  precision: number;
  completeness: number;
}

const getBadgeColor = (score: number) => (score > 0.7 ? 'success' : 'danger');
const getBadgeIcon = (score: number) => (score > 0.7 ? 'check' : 'alert');

export const EvaluatorBadgesGroup: React.FC<EvaluatorBadgesGroupProps> = ({
  relevance,
  precision,
  completeness,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div style={{ display: 'flex', gap: euiTheme.size.s }}>
      <EuiBadge color={getBadgeColor(relevance)} iconType={getBadgeIcon(relevance)}>
        Relevance: {relevance.toFixed(2)}/1
      </EuiBadge>
      <EuiBadge color={getBadgeColor(precision)} iconType={getBadgeIcon(precision)}>
        Precision: {precision.toFixed(2)}/1
      </EuiBadge>
      <EuiBadge color={getBadgeColor(completeness)} iconType={getBadgeIcon(completeness)}>
        Completeness: {completeness.toFixed(2)}/1
      </EuiBadge>
    </div>
  );
};
