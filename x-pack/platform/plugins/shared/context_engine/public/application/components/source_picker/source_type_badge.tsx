/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { getSourceTypeLabel } from './types';
import type { SourceType } from './types';

interface SourceTypeBadgeProps {
  type: SourceType;
  'data-test-subj'?: string;
}

/**
 * Tag that surfaces a source's type (e.g. "ES|QL view").
 */
export const SourceTypeBadge = ({ type, 'data-test-subj': dataTestSubj }: SourceTypeBadgeProps) => (
  <EuiBadge color="hollow" css={{ textTransform: 'uppercase' }} data-test-subj={dataTestSubj}>
    {getSourceTypeLabel(type)}
  </EuiBadge>
);
