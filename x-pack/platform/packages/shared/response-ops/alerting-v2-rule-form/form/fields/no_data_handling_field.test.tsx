/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NoDataHandlingField } from './no_data_handling_field';
import { createFormWrapper } from '../../test_utils';

describe('NoDataHandlingField', () => {
  it('does not render for signal rules', () => {
    render(<NoDataHandlingField />, {
      wrapper: createFormWrapper({ kind: 'signal' }),
    });

    expect(screen.queryByText('No-data behavior')).not.toBeInTheDocument();
  });

  it('renders behavior selector for alert rules', () => {
    const { container } = render(<NoDataHandlingField />, {
      wrapper: createFormWrapper({ kind: 'alert' }),
    });

    expect(screen.getByText('No-data behavior')).toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="ruleNoDataBehaviorSelect"]')
    ).toBeInTheDocument();
  });

  it('renders split timeframe controls when behavior is configured', () => {
    const { container } = render(<NoDataHandlingField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        noData: { behavior: 'no_data', timeframe: '10h' },
      }),
    });

    expect(container.querySelector('[data-test-subj="ruleNoDataTimeframeValueInput"]')).toHaveValue(
      10
    );
    expect(container.querySelector('[data-test-subj="ruleNoDataTimeframeUnitSelect"]')).toHaveValue(
      'h'
    );
  });

  it('defaults timeframe to 5m when enabling no-data behavior', () => {
    const { container } = render(<NoDataHandlingField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        noData: undefined,
      }),
    });

    fireEvent.change(container.querySelector('[data-test-subj="ruleNoDataBehaviorSelect"]')!, {
      target: { value: 'no_data' },
    });

    expect(container.querySelector('[data-test-subj="ruleNoDataTimeframeValueInput"]')).toHaveValue(
      5
    );
    expect(container.querySelector('[data-test-subj="ruleNoDataTimeframeUnitSelect"]')).toHaveValue(
      'm'
    );
  });

  it('clears timeframe controls when behavior is unset', () => {
    const { container } = render(<NoDataHandlingField />, {
      wrapper: createFormWrapper({
        kind: 'alert',
        noData: { behavior: 'no_data', timeframe: '10m' },
      }),
    });

    fireEvent.change(container.querySelector('[data-test-subj="ruleNoDataBehaviorSelect"]')!, {
      target: { value: '' },
    });

    expect(
      container.querySelector('[data-test-subj="ruleNoDataTimeframeValueInput"]')
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="ruleNoDataTimeframeUnitSelect"]')
    ).not.toBeInTheDocument();
  });
});
