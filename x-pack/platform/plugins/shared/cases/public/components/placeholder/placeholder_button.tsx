/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

export const PlaceHolderButton: React.FC = () => {
  return <EuiButton>{'solution action'}</EuiButton>;
};

PlaceHolderButton.displayName = 'PlaceHolderButton';
