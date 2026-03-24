/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActionTypeList } from './action_type_list';
import type { ActionType } from '@kbn/actions-plugin/common';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';

const actionTypes = [
  {
    id: '123',
    name: 'Gen AI',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    isSystemActionType: true,
    supportedFeatureIds: ['generativeAI'],
  } as ActionType,
  {
    id: '456',
    name: 'Another one',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    isSystemActionType: true,
    supportedFeatureIds: ['generativeAI'],
  } as ActionType,
];

const disabledActionType = {
  id: '789',
  name: 'Disabled Action',
  enabled: false,
  enabledInConfig: true,
  enabledInLicense: false,
  minimumLicenseRequired: 'platinum',
  isSystemActionType: true,
  supportedFeatureIds: ['generativeAI'],
} as ActionType;

const actionTypeRegistry = {
  ...actionTypeRegistryMock.create(),
  get: jest.fn().mockReturnValue({ iconClass: 'icon-class' }),
};

const onSelect = jest.fn();

const defaultProps = {
  actionTypes,
  actionTypeRegistry,
  onSelect,
  isMissingConnectorPrivileges: false,
};

describe('ActionTypeList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all action types', () => {
    const { getAllByTestId } = render(<ActionTypeList {...defaultProps} />);

    expect(getAllByTestId('action-option')).toHaveLength(actionTypes.length);
  });

  it('should render action type buttons with correct labels', () => {
    const { getByTestId } = render(<ActionTypeList {...defaultProps} />);

    expect(getByTestId(`action-option-${actionTypes[0].name}`)).toHaveTextContent('Gen AI');
    expect(getByTestId(`action-option-${actionTypes[1].name}`)).toHaveTextContent('Another one');
  });

  it('should call onSelect with actionType when button is clicked', () => {
    const { getByTestId } = render(<ActionTypeList {...defaultProps} />);

    fireEvent.click(getByTestId(`action-option-${actionTypes[0].name}`));

    expect(onSelect).toHaveBeenCalledWith(actionTypes[0]);
  });

  it('should disable buttons when isMissingConnectorPrivileges is true', () => {
    const { getByTestId } = render(
      <ActionTypeList {...defaultProps} isMissingConnectorPrivileges={true} />
    );

    expect(getByTestId(`action-option-${actionTypes[0].name}`)).toBeDisabled();
    expect(getByTestId(`action-option-${actionTypes[1].name}`)).toBeDisabled();
  });

  it('should show tooltip on disabled buttons when missing privileges', async () => {
    const missingPrivilegesTooltip = 'Test tooltip';
    render(
      <ActionTypeList
        {...defaultProps}
        isMissingConnectorPrivileges={true}
        missingPrivilegesTooltip={missingPrivilegesTooltip}
      />
    );

    const firstButton = screen.getByTestId(`action-option-${actionTypes[0].name}`);
    fireEvent.mouseOver(firstButton);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(missingPrivilegesTooltip);
  });

  it('should not call onSelect when clicking a disabled button due to missing privileges', () => {
    const { getByTestId } = render(
      <ActionTypeList {...defaultProps} isMissingConnectorPrivileges={true} />
    );

    fireEvent.click(getByTestId(`action-option-${actionTypes[0].name}`));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should disable button when actionType.enabled is false', () => {
    const { getByTestId } = render(
      <ActionTypeList {...defaultProps} actionTypes={[disabledActionType]} />
    );

    expect(getByTestId(`action-option-${disabledActionType.name}`)).toBeDisabled();
  });

  it('should not call onSelect when clicking a button disabled due to actionType.enabled being false', () => {
    const { getByTestId } = render(
      <ActionTypeList {...defaultProps} actionTypes={[disabledActionType]} />
    );

    fireEvent.click(getByTestId(`action-option-${disabledActionType.name}`));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should render enabled buttons when isMissingConnectorPrivileges is false', () => {
    const { getByTestId } = render(<ActionTypeList {...defaultProps} />);

    expect(getByTestId(`action-option-${actionTypes[0].name}`)).toBeEnabled();
    expect(getByTestId(`action-option-${actionTypes[1].name}`)).toBeEnabled();
  });

  it('should render empty list when actionTypes is empty', () => {
    const { queryAllByTestId } = render(<ActionTypeList {...defaultProps} actionTypes={[]} />);

    expect(queryAllByTestId('action-option')).toHaveLength(0);
  });
});
