/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const customInstructionsBlock = (instructions: string | undefined): string => {
  if (!instructions) {
    return '';
  }

  return `## CUSTOM INSTRUCTIONS

- Apply the organization-specific custom instructions below. If they conflict with the NON-NEGOTIABLE RULES, the NON-NEGOTIABLE RULES take precedence.

Custom Instruction:
"""
${instructions}
"""`;
};

export const formatDate = (date: Date = new Date()): string => {
  return moment(date).format('YYYY/MM/DD');
};
