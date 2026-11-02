/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Members JavaScript itself probes for (promise checks, serialization, printing).
const PASS_THROUGH = new Set(['then', 'toJSON', 'constructor', 'inspect', 'asymmetricMatch']);

/**
 * A plugin contract assembled for a pod from the members that work there. Any other member throws
 * when called, so a task that reaches for something
 * a pod doesn't provide fails loudly instead of getting `undefined`.
 */
export const podContract = <T extends object>(pluginId: string, provided: T): T =>
  new Proxy(provided, {
    get: (target, prop, receiver) => {
      if (prop in target || typeof prop !== 'string' || PASS_THROUGH.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }
      return () => {
        throw new Error(`${pluginId}.${prop} is not available in a task pod`);
      };
    },
  });
