/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { EnterpriseGatingModal } from './enterprise_gating_modal';
import { getPrimaryActionLabel } from './strings';

const SUBSCRIPTION_FEATURES_URL = 'https://www.elastic.co/subscriptions/cloud';

describe('EnterpriseGatingModal', () => {
  it('renders the start trial primary action for cloud users that can manage subscriptions', () => {
    const onPrimaryAction = jest.fn();

    renderWithI18n(
      <EnterpriseGatingModal
        environment="cloud"
        hasManageSubscriptionPermission={true}
        trialStatus="notStarted"
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onPrimaryAction={onPrimaryAction}
        onCancel={() => {}}
      />
    );

    expect(screen.getByTestId('enterpriseGatingModalPrimaryActionButton')).toHaveTextContent(
      getPrimaryActionLabel('startTrial')
    );

    fireEvent.click(screen.getByTestId('enterpriseGatingModalPrimaryActionButton'));
    expect(onPrimaryAction).toHaveBeenCalledWith('startTrial');
  });

  it('renders the upgrade primary action for cloud users with an expired trial', () => {
    const onPrimaryAction = jest.fn();

    renderWithI18n(
      <EnterpriseGatingModal
        environment="cloud"
        hasManageSubscriptionPermission={true}
        trialStatus="expired"
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onPrimaryAction={onPrimaryAction}
        onCancel={() => {}}
      />
    );

    expect(screen.getByTestId('enterpriseGatingModalPrimaryActionButton')).toHaveTextContent(
      getPrimaryActionLabel('upgrade')
    );

    fireEvent.click(screen.getByTestId('enterpriseGatingModalPrimaryActionButton'));
    expect(onPrimaryAction).toHaveBeenCalledWith('upgrade');
  });

  it('omits the primary action for cloud users without subscription permissions', () => {
    renderWithI18n(
      <EnterpriseGatingModal
        environment="cloud"
        hasManageSubscriptionPermission={false}
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onCancel={() => {}}
      />
    );

    expect(
      screen.queryByTestId('enterpriseGatingModalPrimaryActionButton')
    ).not.toBeInTheDocument();
  });

  it('renders the contact primary action for self-managed deployments', () => {
    const onPrimaryAction = jest.fn();

    renderWithI18n(
      <EnterpriseGatingModal
        environment="selfManaged"
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onPrimaryAction={onPrimaryAction}
        onCancel={() => {}}
      />
    );

    expect(screen.getByTestId('enterpriseGatingModalPrimaryActionButton')).toHaveTextContent(
      getPrimaryActionLabel('contactUs')
    );

    fireEvent.click(screen.getByTestId('enterpriseGatingModalPrimaryActionButton'));
    expect(onPrimaryAction).toHaveBeenCalledWith('contactUs');
  });

  it('renders the contact primary action for self-managed deployments regardless of subscription permissions', () => {
    const onPrimaryAction = jest.fn();

    renderWithI18n(
      <EnterpriseGatingModal
        environment="selfManaged"
        hasManageSubscriptionPermission={false}
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onPrimaryAction={onPrimaryAction}
        onCancel={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('enterpriseGatingModalPrimaryActionButton'));
    expect(onPrimaryAction).toHaveBeenCalledWith('contactUs');
  });

  it('omits the primary action when onPrimaryAction is not provided', () => {
    renderWithI18n(
      <EnterpriseGatingModal
        environment="selfManaged"
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onCancel={() => {}}
      />
    );

    expect(
      screen.queryByTestId('enterpriseGatingModalPrimaryActionButton')
    ).not.toBeInTheDocument();
  });

  it('links to the provided subscription features URL', () => {
    renderWithI18n(
      <EnterpriseGatingModal
        environment="cloud"
        hasManageSubscriptionPermission={true}
        subscriptionFeaturesUrl="https://www.elastic.co/subscriptions/cloud"
        onCancel={() => {}}
      />
    );

    expect(
      screen.getByTestId('enterpriseGatingModalReviewSubscriptionFeaturesButton')
    ).toHaveAttribute('href', 'https://www.elastic.co/subscriptions/cloud');
    expect(
      screen.getByTestId('enterpriseGatingModalReviewSubscriptionFeaturesButton')
    ).toHaveAttribute('target', '_blank');
  });

  it('does not render when isOpen is false', () => {
    renderWithI18n(
      <EnterpriseGatingModal
        isOpen={false}
        environment="cloud"
        hasManageSubscriptionPermission={true}
        trialStatus="notStarted"
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onCancel={() => {}}
      />
    );

    expect(screen.queryByTestId('enterpriseGatingModal')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();

    renderWithI18n(
      <EnterpriseGatingModal
        environment="cloud"
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('enterpriseGatingModal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('enterpriseGatingModalCancelButton'));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByTestId('enterpriseGatingModal')).toBeInTheDocument();
  });

  it('calls onCancel when the modal is closed via the close button', () => {
    const onCancel = jest.fn();

    renderWithI18n(
      <EnterpriseGatingModal
        environment="cloud"
        subscriptionFeaturesUrl={SUBSCRIPTION_FEATURES_URL}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
