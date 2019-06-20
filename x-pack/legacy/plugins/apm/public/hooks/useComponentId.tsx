/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef } from 'react';

let uniqueId = 0;
const getUniqueId = () => uniqueId++;

export function useComponentId() {
  const idRef = useRef(getUniqueId());
  return idRef.current;
}
