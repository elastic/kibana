/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, act } from '@testing-library/react';
import { EuiButtonGroup } from '@elastic/eui';

import { TestExternalProviders } from '../../../../../mock/test_providers/test_providers';
import {
  INCOMPATIBLE_TAB_ID,
  SAME_FAMILY_TAB_ID,
  ALL_TAB_ID,
  CUSTOM_TAB_ID,
  ECS_COMPLIANT_TAB_ID,
} from '../constants';
import { CheckFieldsTabs } from '.';
import { SAME_FAMILY } from '../../../../../translations';
import userEvent from '@testing-library/user-event';

describe('HistoricalCheckFieldsTabs', () => {
  it('should render first tab from tabs', () => {
    render(
      <TestExternalProviders>
        <CheckFieldsTabs
          tabs={[
            {
              id: INCOMPATIBLE_TAB_ID,
              name: 'Incompatible',
              badgeColor: 'danger',
              badgeCount: 1,
              content: <div data-test-subj="tested1">{'Incompatible content'}</div>,
            },
            {
              id: SAME_FAMILY_TAB_ID,
              name: 'Same family',
              badgeColor: 'primary',
              badgeCount: 2,
              content: <div data-test-subj="tested2">{'Same family content'}</div>,
            },
            {
              id: CUSTOM_TAB_ID,
              name: 'Custom',
              badgeColor: 'primary',
              badgeCount: 2,
              content: <div data-test-subj="tested3">{'Other content'}</div>,
            },
            {
              id: ECS_COMPLIANT_TAB_ID,
              name: 'ECS compliant',
              badgeColor: 'primary',
              badgeCount: 2,
              content: <div data-test-subj="tested4">{'ECS compliant content'}</div>,
            },
            {
              id: ALL_TAB_ID,
              name: 'All',
              badgeColor: 'primary',
              badgeCount: 2,
              content: <div data-test-subj="tested5">{'All content'}</div>,
            },
          ]}
          renderButtonGroup={(props) => <EuiButtonGroup {...props} />}
        />
      </TestExternalProviders>
    );

    expect(screen.getByTestId(INCOMPATIBLE_TAB_ID)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId(SAME_FAMILY_TAB_ID)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId(CUSTOM_TAB_ID)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId(ECS_COMPLIANT_TAB_ID)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId(ALL_TAB_ID)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('tested1')).toBeInTheDocument();
    expect(screen.queryByTestId('tested2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tested3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tested4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tested5')).not.toBeInTheDocument();
  });

  describe.each([
    [SAME_FAMILY_TAB_ID, 'Same family', 'tested2'],
    [CUSTOM_TAB_ID, 'Custom', 'tested3'],
    [ECS_COMPLIANT_TAB_ID, 'ECS compliant', 'tested4'],
    [ALL_TAB_ID, 'All', 'tested5'],
  ])('when %s is selected', (tabId, tabName, contentTestId) => {
    it(`should render selected (${tabName}) tab`, async () => {
      render(
        <TestExternalProviders>
          <CheckFieldsTabs
            tabs={[
              {
                id: INCOMPATIBLE_TAB_ID,
                name: 'Incompatible',
                badgeColor: 'danger',
                badgeCount: 1,
                content: <div data-test-subj="tested1">{'Incompatible content'}</div>,
              },
              {
                id: SAME_FAMILY_TAB_ID,
                name: SAME_FAMILY,
                badgeColor: 'primary',
                badgeCount: 2,
                content: <div data-test-subj="tested2">{'Same family content'}</div>,
              },
              {
                id: CUSTOM_TAB_ID,
                name: 'Custom',
                badgeColor: 'primary',
                badgeCount: 2,
                content: <div data-test-subj="tested3">{'Other content'}</div>,
              },
              {
                id: ECS_COMPLIANT_TAB_ID,
                name: 'ECS compliant',
                badgeColor: 'primary',
                badgeCount: 2,
                content: <div data-test-subj="tested4">{'ECS compliant content'}</div>,
              },
              {
                id: ALL_TAB_ID,
                name: 'All',
                badgeColor: 'primary',
                badgeCount: 2,
                content: <div data-test-subj="tested5">{'All content'}</div>,
              },
            ]}
            renderButtonGroup={(props) => <EuiButtonGroup {...props} />}
          />
        </TestExternalProviders>
      );

      await act(async () => userEvent.click(screen.getByTestId(tabId)));

      expect(screen.getByTestId(contentTestId)).toBeInTheDocument();
    });
  });

  describe('given disabled tab with disabled reason', () => {
    it('should render disabled tab', () => {
      render(
        <TestExternalProviders>
          <CheckFieldsTabs
            tabs={[
              {
                id: INCOMPATIBLE_TAB_ID,
                name: 'Incompatible',
                badgeColor: 'danger',
                badgeCount: 1,
                content: <div data-test-subj="tested1">{'Incompatible content'}</div>,
              },
              {
                id: SAME_FAMILY_TAB_ID,
                name: SAME_FAMILY,
                badgeColor: 'primary',
                badgeCount: 2,
                content: <div data-test-subj="tested2">{'Same family content'}</div>,
              },
              {
                id: CUSTOM_TAB_ID,
                name: 'Custom',
                badgeColor: 'primary',
                badgeCount: 2,
                content: <div data-test-subj="tested3">{'Other content'}</div>,
              },
              {
                id: ECS_COMPLIANT_TAB_ID,
                name: 'ECS compliant',
                badgeColor: 'primary',
                badgeCount: 2,
                content: <div data-test-subj="tested4">{'ECS compliant content'}</div>,
              },
              {
                id: ALL_TAB_ID,
                name: 'All',
                badgeColor: 'primary',
                badgeCount: 2,
                disabled: true,
                disabledReason: 'Disabled reason',
                content: <div data-test-subj="tested5">{'All content'}</div>,
              },
            ]}
            renderButtonGroup={(props) => <EuiButtonGroup {...props} />}
          />
        </TestExternalProviders>
      );

      expect(screen.getByTestId(ALL_TAB_ID)).toBeDisabled();
      expect(screen.getByTestId('disabledReasonTooltip')).toBeInTheDocument();
    });
  });
});
