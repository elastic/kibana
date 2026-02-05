/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

export type OnFieldErrorsChange = (path: string, errors: string[] | null) => void;

const OnFieldErrorsChangeContext = createContext<OnFieldErrorsChange | null>(null);

export const OnFieldErrorsChangeProvider = ({
  value,
  children,
}: {
  value: OnFieldErrorsChange;
  children: React.ReactNode;
}) => {
  return React.createElement(OnFieldErrorsChangeContext.Provider, { value }, children);
};

export const useOnFieldErrorsChange = (): OnFieldErrorsChange | null => {
  return useContext(OnFieldErrorsChangeContext);
};
