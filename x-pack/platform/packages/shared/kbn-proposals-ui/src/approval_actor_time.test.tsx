/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { ApprovalActorTime } from './approval_actor_time';

const AT = '2026-10-20T11:36:00.000Z';

describe('ApprovalActorTime', () => {
  it('shows the full date and time of a settled decision', () => {
    renderWithKibanaRenderContext(<ApprovalActorTime actorName="elastic" at={AT} />);

    expect(screen.getByText(/20 Oct 2026, \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.queryByText(/ago$/)).not.toBeInTheDocument();
  });

  it('shows the full date and time in a tooltip on the time of a decision in flight', async () => {
    renderWithKibanaRenderContext(<ApprovalActorTime actorName="elastic" at={AT} live />);

    fireEvent.mouseOver(screen.getByText(/ago$/));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/^20 Oct 2026, \d{2}:\d{2}$/);
  });

  it('shows no time and no tooltip when the decision has no time', () => {
    renderWithKibanaRenderContext(<ApprovalActorTime actorName="elastic" />);

    expect(screen.getByText('elastic')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
