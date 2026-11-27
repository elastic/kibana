/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

const ManageRulesHrefContext = React.createContext<string | null | undefined>(undefined);

export const ManageRulesHrefProvider = ManageRulesHrefContext.Provider;

/** `undefined` uses the rules locator. `null` hides Manage rules. */
export const useManageRulesHref = (): string | null | undefined =>
  useContext(ManageRulesHrefContext);
