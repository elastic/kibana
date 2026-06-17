/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Control } from 'react-hook-form';
import type { FieldDescriptor } from '../../../common/schema_types';

/**
 * Shared props for all schema field components.
 */
export interface SchemaFieldProps {
  descriptor: FieldDescriptor;
  control: Control;
}
