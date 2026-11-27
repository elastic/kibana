/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';

export interface FilterHelpTextProps {
  text: string;
  linkLabel: string;
  href: string;
  'data-test-subj'?: string;
}

/** Help text under a scope filter: what the filter does, plus a link to the syntax it accepts. */
export const FilterHelpText = ({
  text,
  linkLabel,
  href,
  'data-test-subj': dataTestSubj,
}: FilterHelpTextProps) => (
  <span data-test-subj={dataTestSubj}>
    {text}{' '}
    <EuiLink href={href} target="_blank" external>
      {linkLabel}
    </EuiLink>
  </span>
);
