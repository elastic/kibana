/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression, toExpression, Ast } from '@kbn/interpreter/common';
import { get } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { RendererFactory, Datatable } from '../../../types';
import { MultiFilter, MultiFilterValue } from './component';
import { RendererStrings } from '../../../i18n';

const { dropdownFilter: strings } = RendererStrings;

interface Config {
  datatable: Datatable;
  columns?: string[];
  filterGroup: string;
}

const MATCH_ALL = '%%CANVAS_MATCH_ALL%%';

const getFilterValue = (filterExpression: string) => {
  if (filterExpression === '') {
    return MATCH_ALL;
  }

  const filterAST = fromExpression(filterExpression);
  return get(filterAST, 'chain[0].arguments.value[0]', MATCH_ALL) as string;
};

export const multiFilter: RendererFactory<Config> = () => ({
  name: 'multi_filter',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  height: 50,
  render(domNode, config, handlers) {
    // const filterExpression = handlers.getFilter();

    // if (filterExpression !== '') {
    //   // NOTE: setFilter() will cause a data refresh, avoid calling unless required
    //   // compare expression and filter, update filter if needed
    //   const { changed, newAst } = syncFilterExpression(config, filterExpression, ['filterGroup']);

    //   if (changed) {
    //     handlers.setFilter(toExpression(newAst));
    //   }
    // }

    // const commit = (commitValue: string) => {
    //   if (commitValue === '%%CANVAS_MATCH_ALL%%') {
    //     handlers.setFilter('');
    //   } else {
    //     const newFilterAST: Ast = {
    //       type: 'expression',
    //       chain: [
    //         {
    //           type: 'function',
    //           function: 'exactly',
    //           arguments: {
    //             value: [commitValue],
    //             column: [config.column],
    //             filterGroup: [config.filterGroup],
    //           },
    //         },
    //       ],
    //     };

    //     const newFilter = toExpression(newFilterAST);
    //     handlers.setFilter(newFilter);
    //   }
    // };

    const onChange = (options: MultiFilterValue[]) => {
      if (options.length === 0) {
        handlers.setFilter('');
      } else {
        const column = options.map(option => option.column);
        const value = options.map(option => option.value);
        const newFilterAST: Ast = {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'exactly',
              arguments: {
                value,
                column,
                filterGroup: [config.filterGroup],
              },
            },
          ],
        };

        const newFilter = toExpression(newFilterAST);
        handlers.setFilter(newFilter);
      }
    };

    const { datatable, columns } = config;

    ReactDOM.render(<MultiFilter {...{ onChange, datatable, columns }} />, domNode, () =>
      handlers.done()
    );

    handlers.onDestroy(() => {
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
