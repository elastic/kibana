/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { toExpression } from '@kbn/interpreter/common';
import { syncFilterExpression } from '../../../public/lib/sync_filter_expression';
import { TimeFilter } from './components/time_filter';

export const timeFilter = () => ({
  name: 'time_filter',
  displayName: 'Time filter',
  help: 'Set a time window',
  reuseDomNode: true, // must be true, otherwise popovers don't work
  render(domNode, config, handlers) {
    const filterExpression = handlers.getFilter();

    if (filterExpression !== '') {
      // NOTE: setFilter() will cause a data refresh, avoid calling unless required
      // compare expression and filter, update filter if needed
      const { changed, newAst } = syncFilterExpression(config, filterExpression, [
        'column',
        'filterGroup',
      ]);

      if (changed) {
        handlers.setFilter(toExpression(newAst));
      }
    }

    ReactDOM.render(
      <TimeFilter compact={config.compact} commit={handlers.setFilter} filter={filterExpression} />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => {
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
