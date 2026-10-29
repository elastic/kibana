/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, type EuiPanelProps } from '@elastic/eui';
import React, { createContext, useContext } from 'react';

const PanelBackdropContext = createContext(false);

/** Marks content drawn over a backdrop (such as the KI graph), so its panels let it show through. */
export const PanelBackdropProvider = PanelBackdropContext.Provider;

export const useIsOverBackdrop = (): boolean => useContext(PanelBackdropContext);

/** A bordered panel that turns transparent over a backdrop. */
export const BackdropAwarePanel = ({ color, ...props }: EuiPanelProps) => {
  const isOverBackdrop = useIsOverBackdrop();
  return <EuiPanel hasBorder {...props} color={isOverBackdrop ? 'transparent' : color} />;
};
