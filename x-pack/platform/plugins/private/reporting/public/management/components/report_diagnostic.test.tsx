/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ReportDiagnostic } from './report_diagnostic';

const mockedApiClient: jest.Mocked<
  Pick<ComponentProps<typeof ReportDiagnostic>['apiClient'], 'verifyBrowser'>
> = {
  verifyBrowser: jest.fn(),
};

const defaultProps: Pick<ComponentProps<typeof ReportDiagnostic>, 'apiClient'> = {
  // @ts-expect-error we don't need to provide the full apiClient for the test
  apiClient: mockedApiClient,
};

const renderComponent = (props: Pick<ComponentProps<typeof ReportDiagnostic>, 'clientConfig'>) => {
  render(
    <IntlProvider locale="en">
      <ReportDiagnostic {...defaultProps} {...props} />
    </IntlProvider>
  );
};

describe('ReportDiagnostic', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not render the component, if image exports aren't supported", () => {
    renderComponent({
      clientConfig: {
        export_types: { pdf: { enabled: false }, png: { enabled: false } },
      } as unknown as ComponentProps<typeof ReportDiagnostic>['clientConfig'],
    });

    expect(screen.queryByTestId('screenshotDiagnosticLink')).not.toBeInTheDocument();
  });

  it('renders the component if image exports are supported', () => {
    renderComponent({
      clientConfig: {
        export_types: {
          png: { enabled: true },
          pdf: { enabled: true },
        },
      } as unknown as ComponentProps<typeof ReportDiagnostic>['clientConfig'],
    });

    expect(screen.getByTestId('screenshotDiagnosticLink')).toBeInTheDocument();
  });

  it('renders a callout with a warning if a problem is detected during diagnosis', async () => {
    const user = userEvent.setup();

    mockedApiClient.verifyBrowser.mockResolvedValue({
      success: false,
      help: ['help'],
      logs: 'logs',
    });

    renderComponent({
      clientConfig: {
        export_types: {
          png: { enabled: true },
          pdf: { enabled: true },
        },
      } as unknown as ComponentProps<typeof ReportDiagnostic>['clientConfig'],
    });

    await user.click(screen.getByTestId('screenshotDiagnosticLink'));

    await waitFor(() => expect(screen.getByTestId('reportDiagnosisFlyout')).toBeInTheDocument());

    user.click(screen.getByTestId('reportingDiagnosticInitiationButton'));

    await waitFor(() =>
      expect(screen.getByTestId('reportingDiagnosticFailureCallout')).toBeInTheDocument()
    );
  });

  it('renders a success callout if no problem is detected during diagnosis', async () => {
    const user = userEvent.setup();

    mockedApiClient.verifyBrowser.mockResolvedValue({
      success: true,
      help: [],
      logs: 'logs',
    });

    renderComponent({
      clientConfig: {
        export_types: {
          png: { enabled: true },
          pdf: { enabled: true },
        },
      } as unknown as ComponentProps<typeof ReportDiagnostic>['clientConfig'],
    });

    await user.click(screen.getByTestId('screenshotDiagnosticLink'));

    await waitFor(() => expect(screen.getByTestId('reportDiagnosisFlyout')).toBeInTheDocument());

    user.click(screen.getByTestId('reportingDiagnosticInitiationButton'));

    await waitFor(() =>
      expect(screen.getByTestId('reportingDiagnosticSuccessCallout')).toBeInTheDocument()
    );
  });
});
