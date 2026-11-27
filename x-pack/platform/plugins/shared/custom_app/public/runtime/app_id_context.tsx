/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

/**
 * The id of the saved app that is shown, when it is one. What a person typed and has not sent is
 * kept for a saved app, in this browser tab, so that a refresh does not lose it; an app that is not
 * saved has nothing to keep it under.
 */
export const AppIdContext = createContext<string | undefined>(undefined);

export const useAppId = (): string | undefined => useContext(AppIdContext);
