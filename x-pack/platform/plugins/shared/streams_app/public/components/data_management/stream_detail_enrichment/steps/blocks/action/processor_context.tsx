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

const ProcessorContext = createContext<ProcessorContextValue | null>(null);

export const ProcessorContextProvider: React.FC<React.PropsWithChildren<ProcessorContextValue>> = ({
  processorId,
  children,
}) => {
  return <ProcessorContext.Provider value={{ processorId }}>{children}</ProcessorContext.Provider>;
};

export const useProcessorContext = () => {
  return useContext(ProcessorContext);
};
