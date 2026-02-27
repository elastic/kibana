/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import { loadYaml } from '@kbn/yaml-loader';

/**
 * React hook that loads the yaml package asynchronously.
 * Returns the yaml module (parse, stringify, Document, etc.) once loaded, or null while loading.
 */
export const useYaml = (): Awaited<ReturnType<typeof loadYaml>> | null => {
  const [yaml, setYaml] = useState<Awaited<ReturnType<typeof loadYaml>> | null>(null);

  useEffect(() => {
    loadYaml().then(setYaml);
  }, []);

  return yaml;
};
