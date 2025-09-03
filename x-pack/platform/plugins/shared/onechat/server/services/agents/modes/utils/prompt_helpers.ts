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

  return `### User instructions

  Below are specific instructions provided by the end user, that you should follow when relevant, as
  long as they don't conflict with your defined task or contradict your primary instructions.

  Instruction: "${instructions}"`;
};

export const formatDate = (date: Date = new Date()): string => {
  return moment(date).format('YYYY/MM/DD HH:mm');
};
