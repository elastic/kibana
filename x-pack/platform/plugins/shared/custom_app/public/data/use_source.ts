/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useSubjectValue } from '../utils/use_subject_value';
import type { SourceState } from './data_layer';
import { useDataLayer } from './data_layer_context';

/** Reads the data of a component. Its query runs for as long as the component is mounted. */
export const useSource = (id: string): SourceState => {
  const layer = useDataLayer();
  useEffect(() => layer.acquire(id), [layer, id]);
  return useSubjectValue(layer.getSource$(id));
};
