/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormState } from '../configure_cases/flyout';

export interface TemplateForm {
  onChange: (formData: FormState<FormData, FormData>) => void;
  initialValue: FormData | null;
}

export const TemplateForm = ({ onChange, initialValue }: TemplateForm) => {
  return <>{`TODO TemplateForm`}</>;
};

TemplateForm.displayName = 'TemplateForm ';
