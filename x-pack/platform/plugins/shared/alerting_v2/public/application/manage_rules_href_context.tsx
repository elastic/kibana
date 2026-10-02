/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

const ManageRulesHrefContext = React.createContext<string | undefined>(undefined);

export const ManageRulesHrefProvider = ManageRulesHrefContext.Provider;

export const useManageRulesHref = (): string | undefined => useContext(ManageRulesHrefContext);
