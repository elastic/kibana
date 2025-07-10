/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';
import { EuiSearchBar } from '@elastic/eui';
import { SchemaFieldStatus, MappedSchemaField } from '../types';

const defaultControls = {
  query: EuiSearchBar.Query.MATCH_ALL,
  status: [] as SchemaFieldStatus[],
  type: [] as Array<MappedSchemaField['type']>,
} as const;

export type TControls = typeof defaultControls;

const mergeReducer = (prev: TControls, updated: Partial<TControls>) => ({ ...prev, ...updated });

export const useControls = () => useReducer(mergeReducer, defaultControls);

export type TControlsChangeHandler = (update: Partial<TControls>) => void;
