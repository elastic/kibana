/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getPrototypeVersion,
  setPrototypeVersion,
  subscribeToPrototypeVersion,
  type PrototypeVersion,
} from './prototype_version_store';

export const usePrototypeVersion = (): [PrototypeVersion, (version: PrototypeVersion) => void] => {
  const [version, setVersion] = useState<PrototypeVersion>(getPrototypeVersion);

  useEffect(() => subscribeToPrototypeVersion(setVersion), []);

  const updateVersion = useCallback((next: PrototypeVersion) => {
    setPrototypeVersion(next);
  }, []);

  return [version, updateVersion];
};
