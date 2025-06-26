/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escape a value with double quote to use with saved object search
 * Example: escapeSearchQueryPhrase('-test"toto') => '"-test\"toto""'
 * @param val
 */
export function escapeSearchQueryPhrase(val: string): string {
  return `"${val.replace(/["]/g, '\\"')}"`;
}

// Adds `.attributes` to any kuery strings that are missing it, this comes from
// internal SO structure. Kuery strings that come from UI will typically have
// `.attributes` hidden to simplify UX, so this normalizes any kuery string for
// filtering SOs
export const normalizeKuery = (savedObjectType: string, kuery: string): string => {
  return kuery.replace(
    new RegExp(`${savedObjectType}\\.(?!attributes\\.)`, 'g'),
    `${savedObjectType}.attributes.`
  );
};
