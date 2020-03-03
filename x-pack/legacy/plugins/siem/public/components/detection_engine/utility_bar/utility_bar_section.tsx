/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BarSection } from './styles';

export interface UtilityBarSectionProps {
  children: React.ReactNode;
}

export const UtilityBarSection = React.memo<UtilityBarSectionProps>(({ children }) => (
  <BarSection>{children}</BarSection>
));

UtilityBarSection.displayName = 'UtilityBarSection';
