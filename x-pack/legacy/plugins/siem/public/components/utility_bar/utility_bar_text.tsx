/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BarText } from './styles';

export interface UtilityBarTextProps {
  children: string | JSX.Element;
  dataTestSubj?: string;
}

export const UtilityBarText = React.memo<UtilityBarTextProps>(({ children, dataTestSubj }) => (
  <BarText data-test-subj={dataTestSubj}>{children}</BarText>
));

UtilityBarText.displayName = 'UtilityBarText';
