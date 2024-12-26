/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ConfigureCaseButtonProps, CaseDetailsLinkProps } from '.';
import { ConfigureCaseButton, CaseDetailsLink } from '.';
import { useCaseViewNavigation } from '../../common/navigation/hooks';

jest.mock('../../common/navigation/hooks');

const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('Configuration button', () => {
  const props: ConfigureCaseButtonProps = {
    label: 'My label',
    msgTooltip: <></>,
    showToolTip: false,
    titleTooltip: '',
  };

  it('renders without the tooltip', async () => {
    render(<ConfigureCaseButton {...props} />);

    const configureButton = await screen.findByTestId('configure-case-button');

    expect(configureButton).toBeEnabled();
    expect(configureButton).toHaveAttribute('href', '/app/security/cases/configure');
    expect(configureButton).toHaveAttribute('aria-label', 'My label');
  });

  it('renders the tooltip correctly when hovering the button', async () => {
    jest.useFakeTimers();

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });

    render(
      <ConfigureCaseButton
        {...props}
        showToolTip={true}
        titleTooltip={'My title'}
        msgTooltip={<>{'My message tooltip'}</>}
      />
    );

    await user.hover(await screen.findByTestId('configure-case-button'));

    expect(await screen.findByTestId('configure-case-tooltip')).toBeInTheDocument();
    expect(await screen.findByText('My title')).toBeInTheDocument();
    expect(await screen.findByText('My message tooltip')).toBeInTheDocument();

    jest.useRealTimers();
  });
});

describe('CaseDetailsLink', () => {
  const getCaseViewUrl = jest.fn().mockReturnValue('/cases/test');
  const navigateToCaseView = jest.fn();

  const props: CaseDetailsLinkProps = {
    detailName: 'test detail name',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({ getCaseViewUrl, navigateToCaseView });
  });

  it('renders', async () => {
    render(<CaseDetailsLink {...props} />);
    expect(await screen.findByText('test detail name')).toBeInTheDocument();
  });

  it('renders the children instead of the detail name if provided', async () => {
    render(<CaseDetailsLink {...props}>{'children'}</CaseDetailsLink>);
    expect(screen.queryByText('test detail name')).toBeFalsy();
    expect(await screen.findByText('children')).toBeInTheDocument();
  });

  it('uses the detailName in the aria-label if the title is not provided', async () => {
    render(<CaseDetailsLink {...props} />);
    expect(
      await screen.findByLabelText(`click to visit case with title ${props.detailName}`)
    ).toBeInTheDocument();
  });

  it('uses the title in the aria-label if provided', async () => {
    render(<CaseDetailsLink {...props} title={'my title'} />);
    expect(await screen.findByText('test detail name')).toBeInTheDocument();
    expect(
      await screen.findByLabelText(`click to visit case with title my title`)
    ).toBeInTheDocument();
  });

  it('calls navigateToCaseViewClick on click', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    jest.useFakeTimers();
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });

    render(<CaseDetailsLink {...props} />);

    await user.click(await screen.findByText('test detail name'));

    expect(navigateToCaseView).toHaveBeenCalledWith({
      detailName: props.detailName,
    });

    jest.useRealTimers();
  });

  it('sets the href correctly', async () => {
    render(<CaseDetailsLink {...props} />);
    expect(getCaseViewUrl).toHaveBeenCalledWith({
      detailName: props.detailName,
    });
    expect(await screen.findByRole('link')).toHaveAttribute('href', '/cases/test');
  });
});
