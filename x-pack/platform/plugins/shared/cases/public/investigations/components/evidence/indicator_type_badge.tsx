/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { useIndicatorTypes } from './use_indicator_types';

/** The Cases label of an indicator's observable type. */
export const IndicatorTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const { getLabel } = useIndicatorTypes();

  return (
    <EuiBadge color="hollow" data-test-subj="investigationEvidenceIndicatorTypeBadge">
      {getLabel(type)}
    </EuiBadge>
  );
};
IndicatorTypeBadge.displayName = 'IndicatorTypeBadge';
