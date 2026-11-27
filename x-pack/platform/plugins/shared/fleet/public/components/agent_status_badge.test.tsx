/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import type { Agent } from '../../common/types';
import { createFleetTestRendererMock } from '../mock';

import { AgentStatusBadge } from './agent_status_badge';

const agent = { active: true, status: 'online' } as unknown as Agent;

describe('AgentStatusBadge', () => {
  it('shows the health of the agent', () => {
    const utils = createFleetTestRendererMock().render(<AgentStatusBadge agent={agent} />);

    expect(utils.getByText('Healthy')).toBeInTheDocument();
    expect(utils.queryByText('Pending')).not.toBeInTheDocument();
  });

  it('shows Pending while there is no agent', () => {
    const utils = createFleetTestRendererMock().render(<AgentStatusBadge />);

    expect(utils.getByText('Pending')).toBeInTheDocument();
  });

  it('shows Pending as the filled default badge, not the outlined one', () => {
    const utils = createFleetTestRendererMock().render(<AgentStatusBadge data-test-subj="badge" />);

    const { className } = utils.getByTestId('badge');
    expect(className).toMatch(/euiBadge-default/);
    expect(className).not.toMatch(/euiBadge-hollow/);
  });

  it('is not a button without an onClick', () => {
    const utils = createFleetTestRendererMock().render(
      <AgentStatusBadge agent={agent} data-test-subj="badge" />
    );

    expect(utils.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['an agent', agent, 'Healthy'],
    ['no agent', undefined, 'Pending'],
  ])('calls onClick when the badge for %s is clicked', (_, badgeAgent, label) => {
    const onClick = jest.fn();
    const utils = createFleetTestRendererMock().render(
      <AgentStatusBadge agent={badgeAgent} onClick={onClick} data-test-subj="badge" />
    );

    fireEvent.click(utils.getByText(label));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(utils.getByTestId('badge')).toHaveAttribute('aria-label', 'Open status details');
  });

  it('puts the test subject on the badge, whatever it shows', () => {
    const renderer = createFleetTestRendererMock();
    expect(
      renderer
        .render(<AgentStatusBadge agent={agent} data-test-subj="badge" />)
        .getByTestId('badge')
    ).toHaveTextContent('Healthy');
    expect(
      renderer.render(<AgentStatusBadge data-test-subj="badge2" />).getByTestId('badge2')
    ).toHaveTextContent('Pending');
  });

  it('adds the extra content to the check-in tooltip of the agent', async () => {
    const utils = createFleetTestRendererMock().render(
      <AgentStatusBadge agent={agent} tooltipExtraContent={<p>See agent info</p>} />
    );

    fireEvent.mouseOver(utils.getByText('Healthy'));

    await waitFor(() => expect(utils.getByText('Never checked in')).toBeInTheDocument());
    expect(utils.getByText('See agent info')).toBeInTheDocument();
  });
});
