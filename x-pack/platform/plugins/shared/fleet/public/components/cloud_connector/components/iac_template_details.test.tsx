/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';

import { IacTemplateDetails } from './iac_template_details';

const VALID_STACK_ARN =
  'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/guid-guid-guid';

describe('IacTemplateDetails', () => {
  const defaultProps = {
    iacDeploymentId: '',
    isDeploymentIdInvalid: false,
    onIacDeploymentIdChange: jest.fn(),
  };

  const renderComponent = (props = {}) =>
    render(
      <I18nProvider>
        <IacTemplateDetails {...defaultProps} {...props} />
      </I18nProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is titled after the CloudFormation stack', () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { name: 'CloudFormation stack details' })
    ).toBeInTheDocument();
  });

  it('renders the actions slot between the title and the Deployment ID field', () => {
    renderComponent({ actions: <button data-test-subj="stackAction">Redeploy</button> });

    const action = screen.getByTestId('stackAction');
    const input = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
    );
    const title = screen.getByRole('heading', { name: 'CloudFormation stack details' });
    const domOrder = Array.from(
      screen
        .getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_SECTION)
        .querySelectorAll('*')
    );
    expect(domOrder.indexOf(title)).toBeLessThan(domOrder.indexOf(action));
    expect(domOrder.indexOf(action)).toBeLessThan(domOrder.indexOf(input));
  });

  it('renders no actions area when none are given', () => {
    renderComponent();

    expect(screen.queryByTestId('stackAction')).not.toBeInTheDocument();
  });

  it('renders the deployment ID passed via props and no template key field', () => {
    renderComponent({ iacDeploymentId: VALID_STACK_ARN });

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT)
    ).toHaveValue(VALID_STACK_ARN);
    expect(screen.queryByText('Template key')).not.toBeInTheDocument();
  });

  it('shows the stack console link when deployment ID is a valid ARN', () => {
    renderComponent({ iacDeploymentId: VALID_STACK_ARN });

    const link = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_VIEW_STACK_LINK
    );
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('stacks/stackinfo?stackId='));
  });

  it('hides the stack console link when deployment ID is empty', () => {
    renderComponent({ iacDeploymentId: '' });

    expect(
      screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_VIEW_STACK_LINK)
    ).not.toBeInTheDocument();
  });

  it('hides the stack console link when deployment ID is not a valid ARN', () => {
    renderComponent({ iacDeploymentId: 'not-an-arn' });

    expect(
      screen.queryByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_VIEW_STACK_LINK)
    ).not.toBeInTheDocument();
  });

  it('shows deployment ID error when isDeploymentIdInvalid is true', () => {
    renderComponent({ isDeploymentIdInvalid: true });

    expect(screen.getByText(/Enter a CloudFormation stack ARN/)).toBeInTheDocument();
  });

  it('calls onIacDeploymentIdChange with trimmed value on input change', () => {
    const onIacDeploymentIdChange = jest.fn();
    renderComponent({ onIacDeploymentIdChange });

    const input = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_DEPLOYMENT_ID_INPUT
    );
    fireEvent.change(input, { target: { value: `  ${VALID_STACK_ARN}  ` } });

    expect(onIacDeploymentIdChange).toHaveBeenCalledWith(VALID_STACK_ARN);
  });
});
