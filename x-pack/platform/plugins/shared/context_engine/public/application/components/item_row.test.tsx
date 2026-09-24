/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ItemRow } from './item_row';

const renderRow = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('ItemRow', () => {
  it('renders the label and icon', () => {
    renderRow(
      <ItemRow
        label="Loyalty Support Agent"
        icon={<span data-test-subj="testIcon" />}
        data-test-subj="testItemRow"
      />
    );

    expect(screen.getByTestId('testItemRow')).toHaveTextContent('Loyalty Support Agent');
    expect(screen.getByTestId('testIcon')).toBeInTheDocument();
  });

  it('renders children instead of the label when provided', () => {
    renderRow(
      <ItemRow label="plain label" icon={<span />} data-test-subj="testItemRow">
        <code>FROM logs-*</code>
      </ItemRow>
    );

    expect(screen.getByTestId('testItemRow')).toHaveTextContent('FROM logs-*');
  });

  it('renders a badge and actions when provided', () => {
    const onAction = jest.fn();
    renderRow(
      <ItemRow
        label="Drive"
        icon={<span />}
        badge={<span data-test-subj="testBadge">Connector</span>}
        actions={
          <button type="button" data-test-subj="testAction" onClick={onAction}>
            Remove
          </button>
        }
      />
    );

    expect(screen.getByTestId('testBadge')).toHaveTextContent('Connector');
    fireEvent.click(screen.getByTestId('testAction'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits badge and actions when they are not provided', () => {
    renderRow(<ItemRow label="Drive" icon={<span />} data-test-subj="testItemRow" />);

    expect(screen.queryByTestId('testBadge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('testAction')).not.toBeInTheDocument();
  });
});
