/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
import { isInlineField } from '../../../common/types/domain/template/fields';

type ParsedField = ParsedTemplate['definition']['fields'][number];

export const toFieldNames = (fields: ParsedField[]) =>
  fields.filter(isInlineField).map((f) => ({
    name: f.name,
    label: f.label ?? f.name,
    type: f.type,
    control: f.control,
  }));
