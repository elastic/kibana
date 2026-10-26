/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

/** The words of a component that can be changed where they are shown. */
export type InlineEditableField = 'text' | 'title';

/**
 * Given by a page that lets the person change the words of the app where they are shown. Absent
 * where the app is only to be used, such as a dashboard or a chat card, so that nothing there
 * offers a change.
 */
export type ChangeNodeWords = (nodeId: string, field: InlineEditableField, words: string) => void;

export const InlineEditContext = createContext<ChangeNodeWords | undefined>(undefined);

export const useChangeNodeWords = (): ChangeNodeWords | undefined => useContext(InlineEditContext);
