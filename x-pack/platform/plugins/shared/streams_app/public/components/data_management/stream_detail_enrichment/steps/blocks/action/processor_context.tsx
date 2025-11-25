/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

interface ProcessorContextValue {
  processorId: string;
}

const ProcessorContext = createContext<ProcessorContextValue | undefined>(undefined);

export const ProcessorContextProvider: React.FC<React.PropsWithChildren<ProcessorContextValue>> = ({
  children,
  processorId,
}) => {
  return <ProcessorContext.Provider value={{ processorId }}>{children}</ProcessorContext.Provider>;
};

export const useProcessorContext = () => {
  const context = useContext(ProcessorContext);
  return context;
};
