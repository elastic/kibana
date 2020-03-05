/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BarText } from './styles';

export interface UtilityBarTextProps {
  children: string;
}

export const UtilityBarText = React.memo<UtilityBarTextProps>(({ children }) => (
  <BarText>{children}</BarText>
));

UtilityBarText.displayName = 'UtilityBarText';
