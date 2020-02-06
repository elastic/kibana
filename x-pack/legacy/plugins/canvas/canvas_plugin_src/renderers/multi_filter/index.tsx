/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression, toExpression, Ast } from '@kbn/interpreter/common';
import { get } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { RendererFactory, Datatable, ExpressionFunctionAST } from '../../../types';
import { MultiFilter, MultiFilterValue } from './component';
import { RendererStrings } from '../../../i18n';
import { syncFilterExpression } from '../../../public/lib/sync_filter_expression';

const { dropdownFilter: strings } = RendererStrings;

interface Config {
  datatable: Datatable;
  columns?: string[];
  filterGroup: string;
}

const getFilterValues = (filterExpression: string): MultiFilterValue[] => {
  if (filterExpression === '') {
    return [];
  }

  const filterAST = fromExpression(filterExpression);
  return filterAST.chain.map(chain => ({
    value: get(chain, 'arguments.value[0]'),
    column: get(chain, 'arguments.column[0]'),
  }));
};

export const multiFilter: RendererFactory<Config> = () => ({
  name: 'multi_filter',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  height: 50,
  render(domNode, config, handlers) {
    const filterExpression = handlers.getFilter();

    if (filterExpression !== '') {
      // NOTE: setFilter() will cause a data refresh, avoid calling unless required
      // compare expression and filter, update filter if needed
      const { changed, newAst } = syncFilterExpression(config, filterExpression, ['filterGroup']);

      if (changed) {
        handlers.setFilter(toExpression(newAst));
      }
    }

    const onChange = (options: MultiFilterValue[]) => {
      if (options.length === 0) {
        handlers.setFilter('');
      } else {
        const filterChain = options.map(
          ({ column, value }: MultiFilterValue): ExpressionFunctionAST => {
            return {
              type: 'function',
              function: 'exactly',
              arguments: {
                value: [value],
                column: [column],
                filterGroup: [config.filterGroup],
              },
            };
          }
        );

        const newFilterAST: Ast = {
          type: 'expression',
          chain: filterChain,
        };

        const newFilter = toExpression(newFilterAST);
        handlers.setFilter(newFilter);
      }
    };

    const { datatable, columns } = config;
    const selected = getFilterValues(filterExpression) as MultiFilterValue[];

    ReactDOM.render(<MultiFilter {...{ onChange, datatable, columns, selected }} />, domNode, () =>
      handlers.done()
    );

    handlers.onDestroy(() => {
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
