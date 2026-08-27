/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import {
  RULES_V1_TAB_TEST_SUBJ,
  RULES_V2_TAB_TEST_SUBJ,
  RULES_V2_TABS_TEST_SUBJ,
  RulesV2TabLayout,
} from './rules_v2_tab_layout';

const renderLayout = (initialPath = '/') =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <RulesV2TabLayout>
          <div data-test-subj="rulesPageContent">list</div>
        </RulesV2TabLayout>
      </MemoryRouter>
    </I18nProvider>
  );

describe('RulesV2TabLayout', () => {
  it('selects the Rules V2 tab on the default path', () => {
    renderLayout('/');

    expect(screen.getByTestId(RULES_V2_TABS_TEST_SUBJ)).toBeInTheDocument();
    expect(screen.getByTestId(RULES_V1_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId(RULES_V2_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('rulesPageContent')).toHaveTextContent('list');
  });

  it('selects the Rules V1 tab on the v1 path', () => {
    renderLayout('/v1');

    expect(screen.getByTestId(RULES_V1_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId(RULES_V2_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'false');
  });

  it('selects the Rules V1 tab on nested v1 paths', () => {
    renderLayout('/v1/logs');

    expect(screen.getByTestId(RULES_V1_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId(RULES_V2_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'false');
  });

  it('navigates to the v1 path when the Rules V1 tab is clicked', () => {
    renderLayout('/');

    fireEvent.click(screen.getByTestId(RULES_V1_TAB_TEST_SUBJ));

    expect(screen.getByTestId(RULES_V1_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId(RULES_V2_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'false');
  });

  it('navigates to the default path when the Rules V2 tab is clicked', () => {
    renderLayout('/v1');

    fireEvent.click(screen.getByTestId(RULES_V2_TAB_TEST_SUBJ));

    expect(screen.getByTestId(RULES_V1_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId(RULES_V2_TAB_TEST_SUBJ)).toHaveAttribute('aria-selected', 'true');
  });
});
