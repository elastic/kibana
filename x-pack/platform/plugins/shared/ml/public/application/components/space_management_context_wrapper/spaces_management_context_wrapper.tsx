/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type FC, type PropsWithChildren } from 'react';
import { useSpacesContextWrapper } from '../../hooks/use_spaces';

export const SpaceManagementContextWrapper: FC<PropsWithChildren<{ feature?: string }>> = ({
  children,
  feature,
}) => {
  const ContextWrapper = useSpacesContextWrapper();

  return <ContextWrapper feature={feature}>{children}</ContextWrapper>;
};
