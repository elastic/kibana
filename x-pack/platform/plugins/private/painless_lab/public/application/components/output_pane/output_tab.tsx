/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';

import { formatResponse } from '../../lib/format';
import type { Response } from '../../types';

interface Props {
  response?: Response;
}

export function OutputTab({ response }: Props) {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCodeBlock language="json" paddingSize="s" isCopyable>
        {formatResponse(response)}
      </EuiCodeBlock>
    </>
  );
}
