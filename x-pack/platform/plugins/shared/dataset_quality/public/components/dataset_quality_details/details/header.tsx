/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { detailsHeaderTitle } from '../../../../common/translations';

export function DetailsHeader() {
  return (
    <EuiTitle size="s">
      <span>{detailsHeaderTitle}</span>
    </EuiTitle>
  );
}
