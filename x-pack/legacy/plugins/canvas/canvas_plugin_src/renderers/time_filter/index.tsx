/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { toExpression } from '@kbn/interpreter/common';
import { RendererStrings } from '../../../i18n';
import { syncFilterExpression } from '../../../public/lib/sync_filter_expression';
import { RendererHandlers } from '../../../types';
import { TimeFilter } from './components/time_filter';
import { Arguments } from '../../functions/common/timefilterControl';

const { timeFilter: strings } = RendererStrings;

interface QuickRange {
  from: string;
  to: string;
  display: string;
}

export const timeFilter = () => ({
  name: 'time_filter',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true, // must be true, otherwise popovers don't work
  render(domNode: HTMLElement, config: Arguments, handlers: RendererHandlers) {
    const filterExpression = handlers.getFilter();

    const customQuickRanges = (
      handlers.useUiSetting<QuickRange[]>('timepicker:quickRanges') || []
    ).map(({ from, to, display }: QuickRange) => ({
      start: from,
      end: to,
      label: display,
    }));

    const customDateFormat = handlers.useUiSetting<string>('dateFormat');

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
      <TimeFilter
        commit={handlers.setFilter}
        filter={filterExpression}
        dateFormat={customDateFormat}
        commonlyUsedRanges={customQuickRanges}
      />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => {
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
