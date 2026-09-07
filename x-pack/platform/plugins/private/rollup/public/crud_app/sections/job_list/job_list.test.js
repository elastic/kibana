/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import { JobListUi } from './job_list';

jest.mock('../../services', () => {
  const services = jest.requireActual('../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

jest.mock('../../services/documentation_links', () => {
  const coreMocks = jest.requireActual('@kbn/core/public/mocks');

  return {
    init: jest.fn(),
    documentationLinks: coreMocks.docLinksServiceMock.createStartContract().links,
  };
});

jest.mock('./job_table', () => ({
  JobTable: () => <div data-test-subj="jobTableStub" />,
}));

jest.mock('./detail_panel', () => ({
  DetailPanel: () => <div data-test-subj="detailPanelStub" />,
}));

const startMock = coreMock.createStart();

const defaultProps = {
  history: { location: { search: '' } },
  loadJobs: jest.fn(),
  refreshJobs: jest.fn(),
  openDetailPanel: jest.fn(),
  closeDetailPanel: jest.fn(),
  hasJobs: false,
  isLoading: false,
  kibana: { services: { setBreadcrumbs: startMock.chrome.setBreadcrumbs } },
};

const renderComponent = (overrides = {}) =>
  renderWithI18n(<JobListUi {...defaultProps} {...overrides} />);

describe('<JobList />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render deprecated prompt when loading is complete and there are no rollup jobs', () => {
    renderComponent();

    expect(screen.getByTestId('jobListDeprecatedPrompt')).toBeInTheDocument();
  });

  it('should display a loading message when loading the jobs', () => {
    renderComponent({ isLoading: true });

    expect(screen.getByText('Loading rollup jobs…')).toBeInTheDocument();
    expect(screen.queryByTestId('jobTableStub')).not.toBeInTheDocument();
  });

  it('should display the <JobTable /> when there are jobs', () => {
    renderComponent({ hasJobs: true });

    expect(screen.getByTestId('jobTableStub')).toBeInTheDocument();
  });

  describe('when there is an API error', () => {
    it('should display an error with the status and the message', () => {
      renderComponent({
        jobLoadError: {
          status: 400,
          body: { statusCode: 400, error: 'Houston we got a problem.' },
        },
      });

      expect(screen.getByTestId('jobListError')).toBeInTheDocument();
      expect(screen.getByText('400 Houston we got a problem.')).toBeInTheDocument();
    });
  });

  describe('when the user does not have the permission to access it', () => {
    it('should render an error message', () => {
      renderComponent({ jobLoadError: { status: 403 } });

      expect(screen.getByTestId('jobListNoPermission')).toBeInTheDocument();
      expect(
        screen.getByText('You do not have permission to view or add rollup jobs.')
      ).toBeInTheDocument();
    });
  });
});
