/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  TARGET_TYPE_DATA_VIEW,
  TARGET_TYPE_INDEX,
  TARGET_TYPE_INDEX_PATTERN,
} from '../../common/target_types';
import { useTargetIdHelpText } from './use_target_id_help_text';

const HelpTextHost = ({ node }: { node: React.ReactNode }) => <div>{node}</div>;

describe('useTargetIdHelpText', () => {
  it('renders index-pattern guidance with non-data-view no-matches hint', () => {
    const { result } = renderHook(() =>
      useTargetIdHelpText({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: '',
        targetIdSearchValue: 'logs',
        targetIdOptionsCount: 0,
      })
    );

    render(<HelpTextHost node={result.current} />);
    expect(
      screen.getByText('Use the literal index pattern string (for example: logs-*).')
    ).toBeTruthy();
    expect(
      screen.getByText(
        'No matching targets found. You can still use a custom value for non-data-view targets.'
      )
    ).toBeTruthy();
  });

  it('renders data-view guidance with no-data-views hint', () => {
    const { result } = renderHook(() =>
      useTargetIdHelpText({
        targetType: TARGET_TYPE_DATA_VIEW,
        targetId: '',
        targetIdSearchValue: 'security',
        targetIdOptionsCount: 0,
      })
    );

    render(<HelpTextHost node={result.current} />);
    expect(
      screen.getByText(
        'Use the data view saved object id (for example: security-solution-default).'
      )
    ).toBeTruthy();
    expect(
      screen.getByText('No data views found. Verify permissions or create a data view first.')
    ).toBeTruthy();
  });

  it('renders only guidance when there is no dynamic hint', () => {
    const { result } = renderHook(() =>
      useTargetIdHelpText({
        targetType: TARGET_TYPE_INDEX_PATTERN,
        targetId: '',
        targetIdSearchValue: '',
        targetIdOptionsCount: 3,
      })
    );

    render(<HelpTextHost node={result.current} />);
    expect(
      screen.getByText('Use the literal index pattern string (for example: logs-*).')
    ).toBeTruthy();
    expect(
      screen.queryByText(
        'No matching targets found. You can still use a custom value for non-data-view targets.'
      )
    ).toBeNull();
  });

  it('renders concrete-index selection hint for index target', () => {
    const { result } = renderHook(() =>
      useTargetIdHelpText({
        targetType: TARGET_TYPE_INDEX,
        targetId: 'logs-index',
        targetIdSearchValue: 'logs-index',
        targetIdOptionsCount: 1,
      })
    );

    render(<HelpTextHost node={result.current} />);
    expect(
      screen.getByText('Use a concrete index name (for example: .alerts-security.alerts-default).')
    ).toBeTruthy();
    expect(
      screen.getByText(
        'When selected, this value is validated to ensure it resolves to a concrete index.'
      )
    ).toBeTruthy();
  });
});
