/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useState } from 'react';

const initialRuleFlyoutUIContext: {
  onClickClose: (() => void) | null;
  hideCloseButton: boolean;
  setOnClickClose: (onClickClose: () => void) => void;
  setHideCloseButton: (hideCloseButton: boolean) => void;
} = {
  onClickClose: null,
  hideCloseButton: false,
  setOnClickClose: () => {},
  setHideCloseButton: () => {},
};

export const RuleFlyoutUIContext = createContext(initialRuleFlyoutUIContext);

export const RuleFlyoutUIContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [onClickClose, setOnClickClose] = useState<(() => void) | null>(null);
  const [hideCloseButton, setHideCloseButton] = useState<boolean>(false);
  return (
    <RuleFlyoutUIContext.Provider
      value={{
        onClickClose,
        hideCloseButton,
        setOnClickClose,
        setHideCloseButton,
      }}
    >
      {children}
    </RuleFlyoutUIContext.Provider>
  );
};

export const useRuleFlyoutUIContext = () => {
  return React.useContext(RuleFlyoutUIContext);
};
