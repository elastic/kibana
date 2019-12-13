/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression } from '@kbn/interpreter/common';
import { get } from 'lodash';
// @ts-ignore untyped Elastic lib
import { interpretAst } from 'plugins/interpreter/interpreter';
// @ts-ignore untyped Elastic lib
import { registries } from 'plugins/interpreter/registries';
import { ExpressionFunction } from 'src/plugins/expressions/public';
// @ts-ignore untyped local
import { getState } from '../state/store';
import { getGlobalFilters } from '../state/selectors/workpad';
import { Filter } from '../../types';
import { getFunctionHelp } from '../../i18n';

interface Arguments {
  group: string[];
  ungrouped: boolean;
}

function getFiltersByGroup(allFilters: string[], groups?: string[], ungrouped = false): string[] {
  if (!groups || groups.length === 0) {
    if (!ungrouped) {
      return allFilters;
    }

    // remove all allFilters that belong to a group
    return allFilters.filter((filter: string) => {
      const ast = fromExpression(filter);
      const expGroups = get(ast, 'chain[0].arguments.filterGroup', []);
      return expGroups.length === 0;
    });
  }

  return allFilters.filter((filter: string) => {
    const ast = fromExpression(filter);
    const expGroups = get(ast, 'chain[0].arguments.filterGroup', []);
    return expGroups.length > 0 && expGroups.every(expGroup => groups.includes(expGroup));
  });
}

export function filters(): ExpressionFunction<'filters', null, Arguments, Filter> {
  const { help, args: argHelp } = getFunctionHelp().filters;

  return {
    name: 'filters',
    type: 'filter',
    help,
    context: {
      types: ['null'],
    },
    args: {
      group: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.group,
        multi: true,
      },
      ungrouped: {
        aliases: ['nogroup', 'nogroups'],
        types: ['boolean'],
        help: argHelp.ungrouped,
        default: false,
      },
    },
    fn: (_context, { group, ungrouped }) => {
      const filterList = getFiltersByGroup(getGlobalFilters(getState()), group, ungrouped);

      if (filterList && filterList.length) {
        const filterExpression = filterList.join(' | ');
        const filterAST = fromExpression(filterExpression);
        return interpretAst(filterAST);
      } else {
        const filterType = registries.types.get('filter');
        return filterType.from(null);
      }
    },
  };
}
