/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateCaseModal } from './create_case_modal';
import { renderWithTestingProviders } from '../../common/mock';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { CreateCase } from '../create';

jest.mock('../create', () => ({
  CreateCase: jest.fn(),
}));

const CreateCaseMock = CreateCase as unknown as jest.Mock;

const onCloseCaseModal = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  isModalOpen: true,
  onCloseCaseModal,
  onSuccess,
  owner: SECURITY_SOLUTION_OWNER,
};

describe('CreateCaseModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CreateCaseMock.mockReturnValue(<></>);
  });

  it('renders', () => {
    renderWithTestingProviders(<CreateCaseModal {...defaultProps} />);

    expect(screen.getByTestId('create-case-modal')).toBeInTheDocument();
  });

  it('it does not render the modal isModalOpen=false ', () => {
    renderWithTestingProviders(<CreateCaseModal {...defaultProps} isModalOpen={false} />);

    expect(screen.queryByTestId('create-case-modal')).not.toBeInTheDocument();
  });

  it('Closing modal calls onCloseCaseModal', async () => {
    renderWithTestingProviders(<CreateCaseModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText('Closes this modal window'));
    expect(onCloseCaseModal).toHaveBeenCalled();
  });

  it('pass the correct props to getCreateCase method', () => {
    renderWithTestingProviders(<CreateCaseModal {...defaultProps} />);

    expect(CreateCaseMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        onSuccess,
        onCancel: onCloseCaseModal,
      })
    );
  });
});
