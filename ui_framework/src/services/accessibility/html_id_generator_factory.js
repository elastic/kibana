/**
 * You may design a complex form which you reuse throughout your UI, sometimes at the same time.
 * In situations like these, ID collision becomes problematic, and manually defining unique
 * IDs becomes tiresome.
 *
 * You can use this factory to instantiate htmlIdGenerator with unique identifiers, and then
 * tie each instance to each form instance. Then you can use the generator to create consistently
 * named IDs that are still unique to each instance of the form.
 */

import { camelCase } from 'lodash';

export function createHtmlIdGenerator(rootPartOrParts = []) {
  const rootParts = Array.isArray(rootPartOrParts) ? rootPartOrParts : [rootPartOrParts];
  const cache = {};

  return (parts, useRootParts = true) => {
    if (!cache[parts]) {
      const root = useRootParts ? rootParts : [];
      const combined = root.concat(parts);
      const id = camelCase(combined);

      cache[parts] = id;
    }

    return cache[parts];
  };
}
