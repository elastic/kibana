/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';

export function useOnce<T>(variable: T): T {
  const ref = useRef(variable);

  if (ref.current !== variable) {
    // eslint-disable-next-line no-console
    console.trace(
      `Variable changed from ${ref.current} to ${variable}, but only the initial value will be taken into account`
    );
  }

  return ref.current;
}
