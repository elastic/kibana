/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useCaseViewNavigation, useCaseViewParams } from '../../../common/navigation';
import { UserActionShowEvent } from './show_event';

const props = {
  id: 'action-id',
  eventId: 'event-id',
  index: 'event-index',
  onShowAlertDetails: jest.fn(),
};

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

const useCaseViewParamsMock = useCaseViewParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('UserActionShowEvent', () => {
  const onShowAlertDetails = jest.fn();
  const navigateToCaseView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewParamsMock.mockReturnValue({ detailName: 'case-id' });
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });
  });

  it('renders the show alert button', () => {
    render(<UserActionShowEvent {...props} onShowEventDetails={onShowAlertDetails} />);
    expect(screen.getByTestId('comment-action-show-event-action-id')).toBeInTheDocument();
  });

  it('calls onShowAlertDetails onClick when defined', () => {
    render(<UserActionShowEvent {...props} onShowEventDetails={onShowAlertDetails} />);
    const button = screen.getByTestId('comment-action-show-event-action-id');
    fireEvent.click(button);
    expect(onShowAlertDetails).toHaveBeenCalledWith('event-id', 'event-index');
    expect(navigateToCaseView).not.toHaveBeenCalled();
  });

  it('calls navigateToCaseView onClick when onShowAlertDetails is undefined', () => {
    render(<UserActionShowEvent {...{ ...props, onShowAlertDetails: undefined }} />);
    const button = screen.getByTestId('comment-action-show-event-action-id');
    fireEvent.click(button);
    expect(navigateToCaseView).toHaveBeenCalledWith({ detailName: 'case-id', tabId: 'events' });
    expect(props.onShowAlertDetails).not.toHaveBeenCalled();
  });
});
