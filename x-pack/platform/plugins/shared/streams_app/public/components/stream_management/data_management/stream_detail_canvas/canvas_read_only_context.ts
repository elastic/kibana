/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

const CanvasReadOnlyContext = createContext(false);

/** Set when the user cannot edit the unit, so nodes and edges hide their edit actions. */
export const CanvasReadOnlyProvider = CanvasReadOnlyContext.Provider;

export const useCanvasReadOnly = (): boolean => useContext(CanvasReadOnlyContext);
