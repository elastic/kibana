/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { ADAPTIVE_ALLOCATIONS_TITLE, ADAPTIVE_ALLOCATIONS_MESSAGE } from '../../translations';

interface Props {
  field: string;
}

const helpTextMessageMap: Record<string, { title: string; message: string }> = {
  max_number_of_allocations: {
    title: ADAPTIVE_ALLOCATIONS_TITLE,
    message: ADAPTIVE_ALLOCATIONS_MESSAGE,
  },
};

export const HelpTextCallout: FC<Props> = ({ field }) => {
  if (!helpTextMessageMap[field]) {
    return null;
  }
  const { title, message } = helpTextMessageMap[field];
  return (
    <div>
      <EuiCallOut title={title} iconType="iInCircle">
        <p>{message}</p>
      </EuiCallOut>
    </div>
  );
};
