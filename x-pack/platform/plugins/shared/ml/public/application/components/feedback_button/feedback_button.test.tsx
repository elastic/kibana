/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FeedBackButton, getSurveyFeedbackURL } from './feedback_button';
import { notificationServiceMock } from '@kbn/core/public/mocks';

// Mock the required dependencies
const mockUseMlKibana = jest.fn();
const mockUseEnabledFeatures = jest.fn();
const mockUseCloudCheck = jest.fn();

jest.mock('../../contexts/kibana', () => ({
  useMlKibana: () => mockUseMlKibana(),
}));

jest.mock('../../contexts/ml', () => ({
  useEnabledFeatures: () => mockUseEnabledFeatures(),
}));

jest.mock('../node_available_warning/hooks', () => ({
  useCloudCheck: () => mockUseCloudCheck(),
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/app/ml/explorer',
  },
  writable: true,
});

describe('FeedBackButton', () => {
  const defaultMocks = {
    useMlKibana: {
      services: {
        kibanaVersion: '9.3.0',
        notifications: notificationServiceMock.createStartContract(),
      },
    },
    useEnabledFeatures: {
      showNodeInfo: true,
    },
    useCloudCheck: {
      isCloud: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseMlKibana.mockReturnValue(defaultMocks.useMlKibana);
    mockUseEnabledFeatures.mockReturnValue(defaultMocks.useEnabledFeatures);
    mockUseCloudCheck.mockReturnValue(defaultMocks.useCloudCheck);
  });

  describe('Component Rendering', () => {
    it('renders the feedback button when jobIds are provided', () => {
      render(<FeedBackButton jobIds={['test-job-1', 'test-job-2']} />);

      expect(screen.getByTestId('mlFeatureFeedbackButton')).toBeInTheDocument();
      expect(screen.getByText('Give feedback')).toBeInTheDocument();
    });

    it('does not render when no jobIds are provided', () => {
      render(<FeedBackButton jobIds={[]} />);

      expect(screen.queryByTestId('mlFeatureFeedbackButton')).not.toBeInTheDocument();
    });

    it('does not render when feedback is not enabled', () => {
      const notificationsMock = notificationServiceMock.createStartContract();
      notificationsMock.feedback.isEnabled.mockReturnValue(false);
      mockUseMlKibana.mockReturnValue({
        services: {
          kibanaVersion: '9.3.0',
          notifications: notificationsMock,
        },
      });
      render(<FeedBackButton jobIds={['test-job-1', 'test-job-2']} />);

      expect(screen.queryByTestId('mlFeatureFeedbackButton')).not.toBeInTheDocument();
    });

    it('has correct button properties', () => {
      render(<FeedBackButton jobIds={['test-job']} />);

      const button = screen.getByTestId('mlFeatureFeedbackButton');
      expect(button).toHaveAttribute('target', '_blank');
      expect(button).toHaveAttribute('aria-label', 'Give feedback');
    });
  });

  describe('URL Generation for Different Environments', () => {
    it('generates URL for self-managed environment', () => {
      render(<FeedBackButton jobIds={['test-job']} />);

      const button = screen.getByTestId('mlFeatureFeedbackButton');
      const href = button.getAttribute('href');

      expect(href).toContain('https://ela.st/anomaly-detection-feedback');
      expect(href).toContain('version=9.3.0');
      expect(href).toContain('deployment_type=Self-Managed');
      expect(href).toContain('path=%2Fapp%2Fml%2Fexplorer');
    });

    it('generates URL for cloud environment', () => {
      mockUseCloudCheck.mockReturnValue({ isCloud: true });

      render(<FeedBackButton jobIds={['test-job']} />);

      const button = screen.getByTestId('mlFeatureFeedbackButton');
      const href = button.getAttribute('href');

      expect(href).toContain('deployment_type=Elastic+Cloud');
    });

    it('generates URL for serverless environment', () => {
      mockUseEnabledFeatures.mockReturnValue({ showNodeInfo: false });

      render(<FeedBackButton jobIds={['test-job']} />);

      const button = screen.getByTestId('mlFeatureFeedbackButton');
      const href = button.getAttribute('href');

      expect(href).toContain('deployment_type=Serverless');
    });

    it('handles missing kibanaVersion gracefully', () => {
      mockUseMlKibana.mockReturnValue({
        services: {
          kibanaVersion: undefined,
          notifications: notificationServiceMock.createStartContract(),
        },
      });

      render(<FeedBackButton jobIds={['test-job']} />);

      const button = screen.getByTestId('mlFeatureFeedbackButton');
      const href = button.getAttribute('href');

      expect(href).toContain('https://ela.st/anomaly-detection-feedback');
      expect(href).not.toContain('version=');
    });
  });
});

describe('getSurveyFeedbackURL', () => {
  const baseParams = {
    formUrl: 'https://example.com/feedback',
    kibanaVersion: '9.3.0',
    sanitizedPath: '/app/ml/explorer',
  };

  it('generates URL with all parameters', () => {
    const url = getSurveyFeedbackURL({
      ...baseParams,
      isCloudEnv: true,
      isServerlessEnv: false,
    });

    expect(url).toBe(
      'https://example.com/feedback?version=9.3.0&deployment_type=Elastic+Cloud&path=%2Fapp%2Fml%2Fexplorer'
    );
  });

  it('generates URL for serverless environment', () => {
    const url = getSurveyFeedbackURL({
      ...baseParams,
      isCloudEnv: false,
      isServerlessEnv: true,
    });

    expect(url).toContain('deployment_type=Serverless');
  });

  it('generates URL for self-managed environment', () => {
    const url = getSurveyFeedbackURL({
      ...baseParams,
      isCloudEnv: false,
      isServerlessEnv: false,
    });

    expect(url).toContain('deployment_type=Self-Managed');
  });

  it('omits deployment_type when environment is undefined', () => {
    const url = getSurveyFeedbackURL({
      ...baseParams,
      isCloudEnv: undefined,
      isServerlessEnv: undefined,
    });

    expect(url).not.toContain('deployment_type');
    expect(url).toContain('version=9.3.0');
    expect(url).toContain('path=%2Fapp%2Fml%2Fexplorer');
  });

  it('omits parameters when they are undefined', () => {
    const url = getSurveyFeedbackURL({
      formUrl: 'https://example.com/feedback',
    });

    expect(url).toBe('https://example.com/feedback');
  });

  it('handles only kibanaVersion provided', () => {
    const url = getSurveyFeedbackURL({
      formUrl: 'https://example.com/feedback',
      kibanaVersion: '9.3.0',
    });

    expect(url).toBe('https://example.com/feedback?version=9.3.0');
  });

  it('handles special characters in sanitized path', () => {
    const url = getSurveyFeedbackURL({
      formUrl: 'https://example.com/feedback',
      sanitizedPath: '/app/ml/jobs/new_job?index=test-index',
    });

    expect(url).toContain('path=%2Fapp%2Fml%2Fjobs%2Fnew_job%3Findex%3Dtest-index');
  });
});

describe('getDeploymentType', () => {
  // Since getDeploymentType is not exported, we test it indirectly through getSurveyFeedbackURL
  it('returns Serverless when isServerlessEnv is true', () => {
    const url = getSurveyFeedbackURL({
      formUrl: 'https://example.com/feedback',
      isCloudEnv: false,
      isServerlessEnv: true,
    });

    expect(url).toContain('deployment_type=Serverless');
  });

  it('returns Elastic Cloud when isCloudEnv is true and isServerlessEnv is false', () => {
    const url = getSurveyFeedbackURL({
      formUrl: 'https://example.com/feedback',
      isCloudEnv: true,
      isServerlessEnv: false,
    });

    expect(url).toContain('deployment_type=Elastic+Cloud');
  });

  it('returns Self-Managed when both are false', () => {
    const url = getSurveyFeedbackURL({
      formUrl: 'https://example.com/feedback',
      isCloudEnv: false,
      isServerlessEnv: false,
    });

    expect(url).toContain('deployment_type=Self-Managed');
  });

  it('returns undefined when both parameters are undefined', () => {
    const url = getSurveyFeedbackURL({
      formUrl: 'https://example.com/feedback',
      isCloudEnv: undefined,
      isServerlessEnv: undefined,
    });

    expect(url).not.toContain('deployment_type');
  });
});
