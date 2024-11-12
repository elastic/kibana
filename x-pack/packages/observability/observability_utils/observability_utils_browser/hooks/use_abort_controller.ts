/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

export function useAbortController() {
  const [controller, setController] = useState(() => new AbortController());

  useEffect(() => {
    return () => {
      controller.abort();
    };
  }, [controller]);

  return {
    signal: controller.signal,
    abort: () => {
      controller.abort();
    },
    refresh: () => {
      setController(() => new AbortController());
    },
  };
}
