/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import {
  noCasesPermissions,
  readCasesPermissions,
  renderWithTestingProviders,
} from '../../common/mock';
import { mockCase } from '../../containers/mock';
import { extractObservables } from '../../containers/api';
import { ExtractObservablesButton } from './extract_observables_button';
import * as i18n from './translations';

jest.mock('../../containers/api');

const platinumLicense = licensingMock.createLicense({ license: { type: 'platinum' } });
const basicLicense = licensingMock.createLicense({ license: { type: 'basic' } });

const caseWithExtractionOn = {
  ...mockCase,
  settings: { ...mockCase.settings, extractObservables: true },
};
const caseWithExtractionOff = {
  ...mockCase,
  settings: { ...mockCase.settings, extractObservables: false },
};

describe('ExtractObservablesButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (extractObservables as jest.Mock).mockResolvedValue({
      case: caseWithExtractionOn,
      status: 'no_new_observables',
      newObservablesCount: 0,
      alertsRequested: 1,
      alertsFound: 1,
    });
  });

  it('renders an enabled button when auto-extract is on for the case', () => {
    renderWithTestingProviders(<ExtractObservablesButton caseData={caseWithExtractionOn} />, {
      wrapperProps: { license: platinumLicense },
    });

    expect(screen.getByTestId('cases-observables-extract')).toBeEnabled();
  });

  it('renders a disabled button when auto-extract is off for the case', () => {
    renderWithTestingProviders(<ExtractObservablesButton caseData={caseWithExtractionOff} />, {
      wrapperProps: { license: platinumLicense },
    });

    expect(screen.getByTestId('cases-observables-extract')).toBeDisabled();
  });

  it('explains in a tooltip why the button is disabled', async () => {
    renderWithTestingProviders(<ExtractObservablesButton caseData={caseWithExtractionOff} />, {
      wrapperProps: { license: platinumLicense },
    });

    // A disabled button ignores pointer events, so hover the tooltip anchor around it.
    await userEvent.hover(screen.getByTestId('cases-observables-extract-tooltip-anchor'));

    expect(await screen.findByText(i18n.EXTRACT_OBSERVABLES_DISABLED_TOOLTIP)).toBeInTheDocument();
  });

  it('does not render when the user cannot update the case', () => {
    renderWithTestingProviders(<ExtractObservablesButton caseData={caseWithExtractionOn} />, {
      wrapperProps: { license: platinumLicense, permissions: readCasesPermissions() },
    });

    expect(screen.queryByTestId('cases-observables-extract')).not.toBeInTheDocument();
  });

  it('does not render when the user has no permissions', () => {
    renderWithTestingProviders(<ExtractObservablesButton caseData={caseWithExtractionOn} />, {
      wrapperProps: { license: platinumLicense, permissions: noCasesPermissions() },
    });

    expect(screen.queryByTestId('cases-observables-extract')).not.toBeInTheDocument();
  });

  it('does not render without a Platinum license', () => {
    renderWithTestingProviders(<ExtractObservablesButton caseData={caseWithExtractionOn} />, {
      wrapperProps: { license: basicLicense },
    });

    expect(screen.queryByTestId('cases-observables-extract')).not.toBeInTheDocument();
  });

  it('is disabled while another action runs', () => {
    renderWithTestingProviders(
      <ExtractObservablesButton caseData={caseWithExtractionOn} isDisabled />,
      { wrapperProps: { license: platinumLicense } }
    );

    expect(screen.getByTestId('cases-observables-extract')).toBeDisabled();
  });

  it('calls the API for the case when clicked', async () => {
    renderWithTestingProviders(<ExtractObservablesButton caseData={caseWithExtractionOn} />, {
      wrapperProps: { license: platinumLicense },
    });

    await userEvent.click(screen.getByTestId('cases-observables-extract'));

    await waitFor(() => expect(extractObservables).toHaveBeenCalledWith(mockCase.id));
  });

  it('shows the loading state until the request ends', async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    (extractObservables as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    renderWithTestingProviders(<ExtractObservablesButton caseData={caseWithExtractionOn} />, {
      wrapperProps: { license: platinumLicense },
    });

    await userEvent.click(screen.getByTestId('cases-observables-extract'));

    await waitFor(() => expect(screen.getByTestId('cases-observables-extract')).toBeDisabled());

    resolveRequest({
      case: caseWithExtractionOn,
      status: 'no_new_observables',
      newObservablesCount: 0,
      alertsRequested: 1,
      alertsFound: 1,
    });

    await waitFor(() => expect(screen.getByTestId('cases-observables-extract')).toBeEnabled());
  });
});
