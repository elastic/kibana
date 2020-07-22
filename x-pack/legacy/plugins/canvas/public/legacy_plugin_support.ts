/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { Registry, registryFactory } from '@kbn/interpreter/common';

type specFn = (...args: any[]) => { name: string };

const fnWrapper = (fn: specFn) => {
  const obj = fn();
  return () => ({
    name: obj.name,
    fn,
  });
};

class LegacyRegistry extends Registry<any, any> {
  register(fn: specFn) {
    super.register(fnWrapper(fn));
  }

  getOriginalFns() {
    return this.toArray().map((entry) => entry.fn);
  }
}

export const legacyRegistries = {
  browserFunctions: new LegacyRegistry(),
  renderers: new LegacyRegistry(),
  types: new LegacyRegistry(),
  elements: new LegacyRegistry(),
  transformUIs: new LegacyRegistry(),
  datasourceUIs: new LegacyRegistry(),
  modelUIs: new LegacyRegistry(),
  viewUIs: new LegacyRegistry(),
  argumentUIs: new LegacyRegistry(),
  templates: new LegacyRegistry(),
  tagUIs: new LegacyRegistry(),
};

(global as any).kbnInterpreter = Object.assign(
  (global as any).kbnInterpreter || {},
  registryFactory(legacyRegistries)
);
