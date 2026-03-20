/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { I18nProvider } from '@kbn/i18n-react';

import { AzureArmTemplateGuide } from './azure_arm_template_guide';

describe('AzureArmTemplateGuide', () => {
  const renderWithIntl = (component: React.ReactElement) => {
    return render(<I18nProvider>{component}</I18nProvider>);
  };

  describe('rendering', () => {
    it('should render all guide steps', () => {
      const testStackId = 'test-stack-id-12345';
      renderWithIntl(<AzureArmTemplateGuide elasticStackId={testStackId} />);

      // Check for key text from each step
      expect(screen.getByText(/Log in to the Azure console/i)).toBeInTheDocument();
      expect(screen.getByText(/Deploy in Azure/i)).toBeInTheDocument();
      expect(screen.getByText(/region/i)).toBeInTheDocument();
      expect(screen.getByText(/Review \+ Create/i)).toBeInTheDocument();
      expect(screen.getByText(/Outputs/i)).toBeInTheDocument();

      expect(screen.getByRole('code')).toHaveTextContent(testStackId);
    });

    it('should render empty code block when elasticStackId is not provided', () => {
      renderWithIntl(<AzureArmTemplateGuide />);

      // Code block should still be rendered but without content
      // Since EuiCodeBlock doesn't have a specific test subject, we check for the code element
      const codeElements = screen.queryAllByRole('code');
      // The code block exists but should be empty or contain no meaningful text
      expect(codeElements.length).toBeGreaterThan(0);
    });
  });
});
