/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import { loadYaml } from '@kbn/yaml-loader';

type YamlModule = Awaited<ReturnType<typeof loadYaml>>;

let cachedYaml: YamlModule | null = null;
let loadPromise: Promise<YamlModule> | null = null;

/**
 * React hook that loads the yaml package asynchronously.
 * Returns the yaml module (parse, stringify, Document, etc.) once loaded, or null while loading.
 * The module is cached globally so subsequent hook calls resolve synchronously.
 */
export const useYaml = (): YamlModule | null => {
  const [yaml, setYaml] = useState<YamlModule | null>(cachedYaml);

  useEffect(() => {
    if (cachedYaml) {
      setYaml(cachedYaml);
      return;
    }

    if (!loadPromise) {
      loadPromise = loadYaml().catch((err) => {
        loadPromise = null;
        throw err;
      });
    }

    loadPromise.then((mod) => {
      cachedYaml = mod;
      setYaml(mod);
    });
  }, []);

  return yaml;
};
