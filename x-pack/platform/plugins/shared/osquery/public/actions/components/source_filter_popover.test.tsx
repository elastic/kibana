/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SourceFilterPopover } from './source_filter_popover';

describe('SourceFilterPopover', () => {
  it('offers a Workflow option and reports it when selected', () => {
    const onChange = jest.fn();
    render(
      <IntlProvider locale="en">
        <SourceFilterPopover selectedSources={[]} onSelectedSourcesChanged={onChange} />
      </IntlProvider>
    );

    fireEvent.click(screen.getByTestId('history-source-filter-button'));
    fireEvent.click(screen.getByTestId('history-source-filter-workflow'));

    expect(onChange).toHaveBeenCalledWith(['workflow']);
  });
});
