/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { MutableRefObject } from 'react';

export interface ESQLEditorContextValue {
  editorHeightRef: MutableRefObject<number | undefined>;
}

export const ESQLEditorContext = createContext<ESQLEditorContextValue | undefined>(undefined);

export const useESQLEditorContext = () => useContext(ESQLEditorContext);
