/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';

export const useGlobalLoading = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  useEffect(() => {
    if (isInitializing) {
      setIsInitializing(false);
    }
  });
  return isInitializing;
};
