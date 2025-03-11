/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useDebounce from 'react-use/lib/useDebounce';
import { useState } from 'react';

export function useDebounced<T>(value: T, debounceDelay: number = 300) {
  const [debouncedValue, setValue] = useState(value);

  useDebounce(
    () => {
      setValue(value);
    },
    debounceDelay,
    [value, setValue]
  );

  return debouncedValue;
}
