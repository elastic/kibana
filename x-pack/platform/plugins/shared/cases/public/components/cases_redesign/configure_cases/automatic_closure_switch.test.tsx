/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import type { AutomaticClosureSwitchProps } from './automatic_closure_switch';
import { AutomaticClosureSwitch } from './automatic_closure_switch';
import { renderWithTestingProviders } from '../../../common/mock';
import * as i18n from '../../configure_cases/translations';

describe('AutomaticClosureSwitch', () => {
  const onChangeClosureType = jest.fn();
  const props: AutomaticClosureSwitchProps = {
    disabled: false,
    closureTypeSelected: 'close-by-user',
    onChangeClosureType,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the switch', () => {
    renderWithTestingProviders(<AutomaticClosureSwitch {...props} />);

    expect(screen.getByTestId('automatic-closure-switch')).toBeInTheDocument();
  });

  it('shows the automatic closure label', () => {
    renderWithTestingProviders(<AutomaticClosureSwitch {...props} />);

    expect(screen.getByText(i18n.CASE_CLOSURE_OPTIONS_NEW_INCIDENT)).toBeInTheDocument();
  });

  it('is unchecked when closure type is close-by-user', () => {
    renderWithTestingProviders(<AutomaticClosureSwitch {...props} />);

    expect(screen.getByTestId('automatic-closure-switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('is checked when closure type is close-by-pushing', () => {
    renderWithTestingProviders(
      <AutomaticClosureSwitch {...props} closureTypeSelected="close-by-pushing" />
    );

    expect(screen.getByTestId('automatic-closure-switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChangeClosureType with close-by-pushing when enabled', async () => {
    renderWithTestingProviders(<AutomaticClosureSwitch {...props} />);

    await userEvent.click(screen.getByTestId('automatic-closure-switch'));

    expect(onChangeClosureType).toHaveBeenCalledWith('close-by-pushing');
  });

  it('calls onChangeClosureType with close-by-user when unchecked', async () => {
    renderWithTestingProviders(
      <AutomaticClosureSwitch {...props} closureTypeSelected="close-by-pushing" />
    );

    await userEvent.click(screen.getByTestId('automatic-closure-switch'));

    expect(onChangeClosureType).toHaveBeenCalledWith('close-by-user');
  });
});
