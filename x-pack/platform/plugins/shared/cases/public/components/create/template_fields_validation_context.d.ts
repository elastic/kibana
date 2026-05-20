import React from 'react';
/**
 * Holds a ref to the inner RHF form's `trigger` function registered by
 * `CreateCaseTemplateFields`. The submit button reads from this ref and
 * calls it before calling the parent form-lib `submit()`, so that RHF
 * Controller validation rules (e.g. pattern, required_when) run and block
 * submission when the inner form is invalid.
 */
export declare const TemplateFieldsValidationContext: React.Context<React.MutableRefObject<(() => Promise<boolean>) | null>>;
