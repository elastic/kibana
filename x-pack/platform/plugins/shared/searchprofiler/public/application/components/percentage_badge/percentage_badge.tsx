/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import classNames from 'classnames';

interface Props {
  timePercentage: string;
  label: string;
  valueType?: 'percent' | 'time';
}

/**
 * This component has IE specific provision for rendering the percentage portion of the badge correctly.
 *
 * This component uses CSS vars injected against the DOM element and resolves this in CSS to calculate
 * how far the percent bar should be drawn.
 */
export const PercentageBadge = ({ timePercentage, label, valueType = 'percent' }: Props) => {
  return (
    <EuiBadge
      className={classNames({
        'prfDevTool__percentBadge__progress--percent': valueType === 'percent',
        'prfDevTool__percentBadge__progress--time': valueType === 'time',
        'euiTextAlign--center': true,
      })}
      style={{ '--prfDevToolProgressPercentage': timePercentage + '%' } as any}
    >
      <span className="prfDevTool__progress--percent-ie" style={{ width: timePercentage + '%' }} />
      <span className="prfDevTool__progressText">{label}</span>
    </EuiBadge>
  );
};
