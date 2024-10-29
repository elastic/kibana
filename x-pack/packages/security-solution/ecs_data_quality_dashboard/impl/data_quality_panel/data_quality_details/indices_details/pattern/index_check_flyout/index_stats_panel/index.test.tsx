/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { IndexStatsPanel } from '.';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../../../mock/test_providers/test_providers';

describe('IndexStatsPanel', () => {
  it('renders stats panel', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders>
          <IndexStatsPanel docsCount={123} ilmPhase="hot" sizeInBytes={789} />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    const container = screen.getByTestId('indexStatsPanel');

    expect(container).toHaveTextContent('Docs123');
    expect(container).toHaveTextContent('ILM phasehot');
    expect(container).toHaveTextContent('Size789');
  });

  describe('when sizeInBytes is not provided', () => {
    it('renders 0 for size', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <IndexStatsPanel docsCount={123} ilmPhase="hot" />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const container = screen.getByTestId('indexStatsPanel');

      expect(container).toHaveTextContent('Docs123');
      expect(container).toHaveTextContent('ILM phasehot');
      expect(container).toHaveTextContent('Size0');
    });
  });

  describe('when ilmPhase is not provided', () => {
    it('does not render ILM phase', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <IndexStatsPanel docsCount={123} sizeInBytes={789} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const container = screen.getByTestId('indexStatsPanel');

      expect(container).toHaveTextContent('Docs123');
      expect(container).not.toHaveTextContent('ILM phase');
      expect(container).toHaveTextContent('Size789');
    });
  });

  describe('when customFieldsCount is provided', () => {
    it('renders custom fields count', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <IndexStatsPanel docsCount={123} sizeInBytes={789} customFieldsCount={456} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const container = screen.getByTestId('indexStatsPanel');

      expect(container).toHaveTextContent('Docs123');
      expect(container).toHaveTextContent('Size789');
      expect(container).toHaveTextContent('Custom fields456');
    });
  });

  describe('when ecsCompliantFieldsCount is provided', () => {
    it('renders ecs compliant fields count', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <IndexStatsPanel docsCount={123} sizeInBytes={789} ecsCompliantFieldsCount={456} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const container = screen.getByTestId('indexStatsPanel');

      expect(container).toHaveTextContent('Docs123');
      expect(container).toHaveTextContent('Size789');
      expect(container).toHaveTextContent('ECS compliant fields456');
    });
  });

  describe('when allFieldsCount is provided', () => {
    it('renders all fields count', () => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders>
            <IndexStatsPanel docsCount={123} sizeInBytes={789} allFieldsCount={456} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      const container = screen.getByTestId('indexStatsPanel');

      expect(container).toHaveTextContent('Docs123');
      expect(container).toHaveTextContent('Size789');
      expect(container).toHaveTextContent('All fields456');
    });
  });
});
