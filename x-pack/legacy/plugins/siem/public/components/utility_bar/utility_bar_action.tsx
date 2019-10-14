/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BarActionLink, BarActionLinkProps } from './styles';

export interface UtilityBarActionProps extends BarActionLinkProps {
  children: React.ReactNode;
}

export const UtilityBarAction = React.memo<UtilityBarActionProps>(({ children, href, onClick }) => (
  <BarActionLink href={href} onClick={onClick}>
    {children}
  </BarActionLink>
));
UtilityBarAction.displayName = 'UtilityBarAction';
