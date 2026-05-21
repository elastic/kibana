/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * Holds a ref to the inner RHF form's `trigger` function registered by
 * `CreateCaseTemplateFields`. The submit button reads from this ref and
 * calls it before calling the parent form-lib `submit()`, so that RHF
 * Controller validation rules (e.g. pattern, required_when) run and block
 * submission when the inner form is invalid.
 */
export const TemplateFieldsValidationContext = React.createContext<
  React.MutableRefObject<(() => Promise<boolean>) | null>
>({ current: null });
