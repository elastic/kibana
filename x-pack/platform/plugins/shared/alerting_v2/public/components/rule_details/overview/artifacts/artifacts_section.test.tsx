/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ArtifactsSection } from './artifacts_section';

jest.mock('./dashboard_artifacts_subsection', () => ({
  DashboardArtifactsSubsection: () => (
    <div data-test-subj="dashboardArtifactsSubsectionMock">dashboards</div>
  ),
}));

jest.mock('./action_policies_artifacts_subsection', () => ({
  ActionPoliciesArtifactsSubsection: () => (
    <div data-test-subj="actionPoliciesArtifactsSubsectionMock">action policies</div>
  ),
}));

const mockCanRead = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => key,
  useService: () => ({ canRead: mockCanRead }),
}));

describe('ArtifactsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRead.mockReturnValue(true);
  });

  it('renders the artifacts accordion with dashboard and action policy subsections', () => {
    render(
      <I18nProvider>
        <ArtifactsSection />
      </I18nProvider>
    );

    expect(screen.getByTestId('ruleArtifactsSection')).toBeInTheDocument();
    expect(screen.getByText('Artifacts')).toBeInTheDocument();
    expect(screen.getByTestId('ruleArtifactsSubsectionsRow')).toBeInTheDocument();
    expect(screen.getByTestId('dashboardArtifactsSubsectionMock')).toBeInTheDocument();
    expect(screen.getByTestId('actionPoliciesArtifactsSubsectionMock')).toBeInTheDocument();
    expect(mockCanRead).toHaveBeenCalledWith('actionPolicies');
  });

  it('hides the action policies subsection when the user cannot read action policies', () => {
    mockCanRead.mockReturnValue(false);

    render(
      <I18nProvider>
        <ArtifactsSection />
      </I18nProvider>
    );

    expect(screen.getByTestId('dashboardArtifactsSubsectionMock')).toBeInTheDocument();
    expect(screen.queryByTestId('actionPoliciesArtifactsSubsectionMock')).not.toBeInTheDocument();
  });
});
