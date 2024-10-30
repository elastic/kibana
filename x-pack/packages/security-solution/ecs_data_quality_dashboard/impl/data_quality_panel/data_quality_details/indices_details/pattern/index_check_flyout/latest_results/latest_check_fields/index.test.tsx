/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../../../../mock/test_providers/test_providers';
import { auditbeatWithAllResults } from '../../../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { LatestCheckFields } from '.';

describe('IndexCheckFields', () => {
  beforeEach(() => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <LatestCheckFields
            indexName="indexName"
            docsCount={123}
            ilmPhase="hot"
            patternRollup={auditbeatWithAllResults}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );
  });
  it('should render the index check fields', () => {
    expect(screen.getByTestId('latestCheckFields')).toBeInTheDocument();
  });

  it('should render incompatible tab content by default', () => {
    expect(screen.getByTestId('incompatibleTab')).toBeInTheDocument();
    expect(screen.getByTestId('incompatibleTabContent')).toBeInTheDocument();
  });

  describe.each([
    ['sameFamilyTab', 'sameFamilyTabContent'],
    ['customTab', 'customTabContent'],
    ['ecsCompliantTab', 'ecsCompliantTabContent'],
    ['allTab', 'allTabContent'],
  ])('when clicking on %s tab', (tab, tabContent) => {
    it(`should render ${tabContent} content`, async () => {
      await userEvent.click(screen.getByTestId(tab));

      expect(screen.getByTestId(tabContent)).toBeInTheDocument();
    });
  });
});
