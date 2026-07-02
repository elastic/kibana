/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

export interface CartRailContextValue {
  isPopoverMode: boolean;
}

const CartRailContext = createContext<CartRailContextValue | null>(null);

export const CartRailProvider: React.FC<
  CartRailContextValue & { children: React.ReactNode }
> = ({ isPopoverMode, children }) => (
  <CartRailContext.Provider value={{ isPopoverMode }}>{children}</CartRailContext.Provider>
);

export const useOptionalCartRailContext = (): CartRailContextValue | null =>
  useContext(CartRailContext);
