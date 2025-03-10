/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ActionTypeSelectorModal } from './action_type_selector_modal';
import { ActionType } from '@kbn/actions-plugin/common';
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
const actionTypeRegistry = {
  ...actionTypeRegistryMock.create(),
  get: jest.fn().mockReturnValue({ iconClass: 'icon-class' }),
};
const onClose = jest.fn();
const onSelect = jest.fn();

const defaultProps = {
  actionTypes,
  actionTypeRegistry,
  onClose,
  onSelect,
  actionTypeSelectorInline: false,
};

describe('ActionTypeSelectorModal', () => {
  it('should render modal with header and body when actionTypes is not empty', () => {
    const { getByTestId, getAllByTestId } = render(<ActionTypeSelectorModal {...defaultProps} />);

    expect(getByTestId('action-type-selector-modal')).toBeInTheDocument();

    expect(getAllByTestId('action-option')).toHaveLength(actionTypes.length);
  });

  it('should render null when actionTypes is undefined', () => {
    const { actionTypes: _, ...rest } = defaultProps;
    const { queryByTestId } = render(<ActionTypeSelectorModal {...rest} />);

    expect(queryByTestId('action-type-selector-modal')).not.toBeInTheDocument();
  });

  it('should render null when actionTypes is an empty array', () => {
    const { queryByTestId } = render(
      <ActionTypeSelectorModal {...defaultProps} actionTypes={[]} />
    );

    expect(queryByTestId('action-type-selector-modal')).not.toBeInTheDocument();
  });

  it('should call onSelect with actionType when clicked', () => {
    const { getByTestId } = render(<ActionTypeSelectorModal {...defaultProps} />);

    fireEvent.click(getByTestId(`action-option-${actionTypes[1].name}`));

    expect(onSelect).toHaveBeenCalledWith(actionTypes[1]);
  });
});
