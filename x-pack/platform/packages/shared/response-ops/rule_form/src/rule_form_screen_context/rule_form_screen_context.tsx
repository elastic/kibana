/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useState } from 'react';

/*
 * A generic wrapper for keeping track of which screens to show on top of the Rule Form
 * This provides logic that works on both the Rule Page, which displays these screens in a modal,
 * and the Rule Flyout, which displays these screens by replacing the entire content of the flyout.
 */
const initialRuleFormScreenContextState = {
  isConnectorsScreenVisible: false,
  isShowRequestScreenVisible: false,
  setIsConnectorsScreenVisible: (show: boolean) => {},
  setIsShowRequestScreenVisible: (show: boolean) => {},
};

export const RuleFormScreenContext = createContext(initialRuleFormScreenContextState);

export const RuleFormScreenContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [isConnectorsScreenVisible, setIsConnectorsScreenVisible] = useState(false);
  const [isShowRequestScreenVisible, setIsShowRequestScreenVisible] = useState(false);
  return (
    <RuleFormScreenContext.Provider
      value={{
        isConnectorsScreenVisible,
        isShowRequestScreenVisible,
        setIsConnectorsScreenVisible,
        setIsShowRequestScreenVisible,
      }}
    >
      {children}
    </RuleFormScreenContext.Provider>
  );
};
