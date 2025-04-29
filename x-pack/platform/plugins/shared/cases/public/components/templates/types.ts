/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateConfiguration } from '../../../common/types/domain';
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';

export type TemplateFormProps = Pick<TemplateConfiguration, 'key' | 'name'> &
  Partial<CaseFormFieldsSchemaProps> & {
    templateTags?: string[];
    templateDescription?: string;
  };
