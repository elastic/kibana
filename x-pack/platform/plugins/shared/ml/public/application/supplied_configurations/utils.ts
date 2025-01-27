/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Clause, Value } from '@elastic/eui/src/components/search_bar/query/ast';
import type { Module } from '../../../common/types/modules';
import { stringMatch } from '../util/string_utils';

export function filterModules(items: Module[], clauses: Clause[]) {
  if (clauses.length === 0) {
    return items;
  }
  // keep count of the number of matches we make as we're looping over the clauses
  // we only want to return items which match all clauses, i.e. each search term is ANDed
  const matches = items.reduce<Record<string, { module: Module; count: number }>>((p, module) => {
    p[module.id] = {
      module,
      count: 0,
    };
    return p;
  }, {});

  clauses.forEach((c) => {
    // the search term could be negated with a minus, e.g. -bananas
    const bool = c.match === 'must';
    let matchingItems: Module[] = [];

    if (c.type === 'term') {
      // filter term based clauses, e.g. bananas
      // match on id, description, title
      // if the term has been negated, AND the matches
      if (bool === true) {
        matchingItems = items.filter(
          (item) =>
            stringMatch(item.id, c.value) === bool ||
            stringMatch(item.description, c.value) === bool ||
            stringMatch(item.title, c.value) === bool
        );
      } else {
        matchingItems = items.filter(
          (item) =>
            stringMatch(item.id, c.value) === bool &&
            stringMatch(item.description, c.value) === bool &&
            stringMatch(item.title, c.value) === bool
        );
      }
    } else {
      // filter other clauses, i.e. the tags filter
      if (c.type === 'field') {
        if (Array.isArray(c.value)) {
          // Module tags is an array of string(s) e.g. c.value => ['observability', 'logs', 'security']
          matchingItems = items.filter((item) =>
            (c.value as Value[]).some((filterValue) =>
              Array.isArray(item[c.field as keyof Module])
                ? item[c.field as keyof Module]?.includes(filterValue)
                : item[c.field as keyof Module] === filterValue
            )
          );
        } else {
          matchingItems = items.filter(
            (item) => item[c.field as keyof Pick<typeof item, 'tags'>] === c.value
          );
        }
      }
    }

    matchingItems.forEach((j) => matches[j.id].count++);
  });

  // loop through the matches and return only those items which have match all the clauses
  const filtered = Object.values(matches)
    .filter((m) => (m && m.count) >= clauses.length)
    .map((m) => m.module);

  return filtered;
}
