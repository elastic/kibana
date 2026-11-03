/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A setup contract whose registrations do nothing. In Kibana the plugin's own server entry has
 * already registered everything (and its contributors' server entries theirs), so a tasks entry that
 * registered again would throw; where Kibana runs tasks entries, they hand contributors this instead.
 */
export const toNoopContract = <T extends object>(contract: T): T =>
  new Proxy(contract, {
    get: (target, prop) => {
      const value = Reflect.get(target, prop);
      if (typeof value === 'function') return () => undefined;
      if (value !== null && typeof value === 'object') return toNoopContract(value);
      return value;
    },
  });
