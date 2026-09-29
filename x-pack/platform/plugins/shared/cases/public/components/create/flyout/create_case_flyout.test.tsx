/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateCaseFlyout } from './create_case_flyout';

import { renderWithTestingProviders } from '../../../common/mock';
import { useGetTags } from '../../../containers/use_get_tags';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import { useAvailableCasesOwners } from '../../app/use_available_owners';
import { connectorsMock } from '../../../containers/mock';
import { useCaseConfigureResponse } from '../../configure_cases/__mock__';
import { waitForComponentToUpdate } from '../../../common/test_utils';

vi.mock('../../../containers/use_get_tags');
vi.mock('../../../containers/configure/use_get_supported_action_connectors');
vi.mock('../../../containers/configure/use_get_case_configuration');
vi.mock('../../markdown_editor/plugins/lens/use_lens_draft_comment');
vi.mock('../../app/use_available_owners');

const useGetTagsMock = useGetTags as Mock;
const useGetConnectorsMock = useGetSupportedActionConnectors as Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as Mock;
const useAvailableOwnersMock = useAvailableCasesOwners as Mock;

const onClose = vi.fn();
const onSuccess = vi.fn();
const defaultProps = {
  onClose,
  onSuccess,
  owner: 'securitySolution',
};

describe('CreateCaseFlyout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAvailableOwnersMock.mockReturnValue(['securitySolution', 'observability']);
    useGetTagsMock.mockReturnValue({ data: ['test'] });
    useGetConnectorsMock.mockReturnValue({ isLoading: false, data: connectorsMock });
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
  });

  it('renders', async () => {
    renderWithTestingProviders(<CreateCaseFlyout {...defaultProps} />);
    await waitForComponentToUpdate();

    expect(await screen.findByTestId('create-case-flyout')).toBeInTheDocument();
  });

  it('should call onCloseCaseModal when closing the flyout', async () => {
    renderWithTestingProviders(<CreateCaseFlyout {...defaultProps} />);
    await waitForComponentToUpdate();

    await userEvent.click(await screen.findByTestId('euiFlyoutCloseButton'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders headerContent when passed', async () => {
    const headerContent = <p data-test-subj="testing123" />;
    renderWithTestingProviders(
      <CreateCaseFlyout {...defaultProps} headerContent={headerContent} />
    );

    await waitForComponentToUpdate();

    expect(await screen.findByTestId('create-case-flyout-header')).toBeInTheDocument();
    expect(await screen.findByTestId('testing123')).toBeInTheDocument();
  });
});
