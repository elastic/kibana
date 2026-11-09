/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateCaseFlyout } from './create_case_flyout';

import { renderWithTestingProviders } from '../../../common/mock';
import { useGetTags } from '../../../containers/use_get_tags';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import { useAvailableCasesOwners } from '../../app/use_available_owners';
import { connectorsMock } from '../../../containers/mock';
import { useCaseConfigureResponse } from '../../configure_cases/__mock__';

jest.mock('../../../containers/use_get_tags');
jest.mock('../../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../../containers/configure/use_get_case_configuration');
jest.mock('../../markdown_editor/plugins/lens/use_lens_draft_comment');
jest.mock('../../app/use_available_owners');

const useGetTagsMock = useGetTags as jest.Mock;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useAvailableOwnersMock = useAvailableCasesOwners as jest.Mock;

const onClose = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  onClose,
  onSuccess,
  owner: 'securitySolution',
};

describe('CreateCaseFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useAvailableOwnersMock.mockReturnValue(['securitySolution', 'observability']);
    useGetTagsMock.mockReturnValue({ data: ['test'] });
    useGetConnectorsMock.mockReturnValue({ isLoading: false, data: connectorsMock });
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
  });

  it('renders', () => {
    renderWithTestingProviders(<CreateCaseFlyout {...defaultProps} />);

    expect(screen.getByTestId('create-case-flyout')).toBeInTheDocument();
  });

  it('should call onCloseCaseModal when closing the flyout', async () => {
    renderWithTestingProviders(<CreateCaseFlyout {...defaultProps} />);

    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });

  it('renders headerContent when passed', () => {
    const headerContent = <p data-test-subj="testing123" />;
    renderWithTestingProviders(
      <CreateCaseFlyout {...defaultProps} headerContent={headerContent} />
    );

    expect(screen.getByTestId('create-case-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('testing123')).toBeInTheDocument();
  });
});
