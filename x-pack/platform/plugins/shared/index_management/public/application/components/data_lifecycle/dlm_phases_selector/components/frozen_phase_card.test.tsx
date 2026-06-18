/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react';
import { FrozenPhaseCard } from './frozen_phase_card';

const defaultDuration = { enabled: true, value: '30', unit: 'd' };

const renderFrozenPhaseCard = (props?: Partial<React.ComponentProps<typeof FrozenPhaseCard>>) => {
  const onChange = jest.fn();

  const result = render(
    <IntlProvider>
      <FrozenPhaseCard
        id="frozenPhase"
        color="#006bb4"
        duration={defaultDuration}
        disabled={false}
        isFormDisabled={false}
        onChange={onChange}
        {...props}
      />
    </IntlProvider>
  );

  return { ...result, onChange };
};

describe('FrozenPhaseCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides configuration when the phase is disabled', () => {
    const { queryByTestId } = renderFrozenPhaseCard({
      duration: { ...defaultDuration, enabled: false },
    });

    expect(queryByTestId('frozenDurationValue')).not.toBeInTheDocument();
    expect(queryByTestId('frozenSearchableSnapshotLabel')).not.toBeInTheDocument();
  });

  it('hides configuration when a disabled reason is present', () => {
    const { queryByTestId } = renderFrozenPhaseCard({
      disabled: true,
      disabledReason: {
        type: 'enterprise',
        onClick: jest.fn(),
      },
    });

    expect(queryByTestId('frozenDurationValue')).not.toBeInTheDocument();
    expect(queryByTestId('frozenSearchableSnapshotLabel')).not.toBeInTheDocument();
  });

  it('renders searchable snapshot info with repository name and manage link', () => {
    const { getByTestId, getByRole } = renderFrozenPhaseCard({
      defaultSnapshotRepository: 'my-repo',
      manageRepositoriesHref: '/app/management/data/snapshot_restore/repositories',
    });

    expect(getByTestId('frozenSearchableSnapshotLabel')).toBeInTheDocument();
    expect(getByTestId('frozenSearchableSnapshotInfo')).toHaveTextContent('my-repo');

    const manageLink = getByRole('link', { name: /manage your repositories/i });
    expect(manageLink).toHaveAttribute(
      'href',
      '/app/management/data/snapshot_restore/repositories'
    );
  });

  it('renders searchable snapshot label without repository info when name is omitted', () => {
    const { getByTestId, queryByRole } = renderFrozenPhaseCard();

    expect(getByTestId('frozenSearchableSnapshotLabel')).toBeInTheDocument();
    expect(queryByRole('link', { name: /manage your repositories/i })).not.toBeInTheDocument();
  });

  it('calls onChange when toggling the phase checkbox', () => {
    const { getByTestId, onChange } = renderFrozenPhaseCard({
      duration: { ...defaultDuration, enabled: false },
    });

    fireEvent.click(getByTestId('dlmPhasesSelectorFrozenPhaseCard'));

    expect(onChange).toHaveBeenCalledWith({
      enabled: true,
      value: '30',
      unit: 'd',
    });
  });

  it('invokes disabled reason onClick from the badge', () => {
    const onDisabledReasonClick = jest.fn();
    const { getByTestId } = renderFrozenPhaseCard({
      disabled: true,
      disabledReason: {
        type: 'enterprise',
        onClick: onDisabledReasonClick,
      },
    });

    fireEvent.click(getByTestId('enterpriseLicenseRequiredBadge'));

    expect(onDisabledReasonClick).toHaveBeenCalledTimes(1);
  });
});
