/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

/**
 * True while a step form is shown but must not be edited. A disabled `<fieldset>` already makes
 * native controls inert; this is for the fields that are not native controls (a focusable `div`
 * that mounts an editor, a Monaco editor), which ignore it.
 */
export const StepFormReadOnlyContext = createContext(false);

export const useStepFormReadOnly = (): boolean => useContext(StepFormReadOnlyContext);
