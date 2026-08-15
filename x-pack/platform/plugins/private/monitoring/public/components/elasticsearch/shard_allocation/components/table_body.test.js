/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { TableBody } from './table_body';
import { ClusterView } from './cluster_view';

// TODO: Consider importing from `../lib/labels` instead. No production label set
// produces 3 columns; real sets have 1 or 2.
const labels = [
  { content: 'Unassigned', showToggleSystemIndicesComponent: false },
  { content: 'Indices', showToggleSystemIndicesComponent: false },
  { content: 'Nodes', showToggleSystemIndicesComponent: false },
];

describe('TableBody', () => {
  it('uses owned styling for the no shards allocated message', () => {
    const { getByText } = render(
      <I18nProvider>
        <EuiThemeProvider>
          <table>
            <TableBody totalCount={0} cols={3} />
          </table>
        </EuiThemeProvider>
      </I18nProvider>
    );
    const message = getByText('There are no shards allocated.');

    expect(message).not.toHaveClass('text-center');
    expect(message).not.toHaveClass('lead');
  });
});

describe('ClusterView', () => {
  it('does not use the Bootstrap table class', () => {
    const { container } = render(
      <I18nProvider>
        <EuiThemeProvider>
          <ClusterView
            labels={labels}
            totalCount={0}
            nodesByIndices={[]}
            showSystemIndices={false}
            toggleShowSystemIndices={() => {}}
          />
        </EuiThemeProvider>
      </I18nProvider>
    );
    const table = container.querySelector('table');

    expect(table).not.toHaveClass('table');
  });
});
