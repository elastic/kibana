/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensByValueSerializedState } from '@kbn/lens-common';
import type { LensByRefSerializedAPIConfig } from '@kbn/lens-common-2';
import type { TypeOf } from '@kbn/config-schema';

import type { getLensByValuePanelSchema } from './transforms';

export type * from './api/types';

export type FlattenedLensByValuePanelSchema = TypeOf<ReturnType<typeof getLensByValuePanelSchema>>;

/**
 * All possible panel states from a dashboard
 * - Flattened by-value api config state
 * - By-value Lens Saved Object state
 * - By-reference Lens Saved Object/API config
 */
export type AnyLensPanelConfig =
  | FlattenedLensByValuePanelSchema
  | LensByRefSerializedAPIConfig
  | LensByValueSerializedState;
