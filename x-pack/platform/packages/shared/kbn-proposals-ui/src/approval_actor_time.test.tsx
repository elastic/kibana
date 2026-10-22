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
  it('shows the full date and time in a tooltip on the time of a settled decision', async () => {
    renderWithKibanaRenderContext(
      <ApprovalActorTime actorName="elastic" at={AT} outcome="approved" />
    );

    fireEvent.mouseOver(screen.getByText(/^\d{1,2}:\d{2}/));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/^20 Oct 2026, \d{2}:\d{2}$/);
  });

  it('shows no tooltip while the decision is still being sent', () => {
    const { container } = renderWithKibanaRenderContext(
      <ApprovalActorTime actorName="elastic" at={AT} live />
    );

    container.querySelectorAll('*').forEach((element) => fireEvent.mouseOver(element));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows no time and no tooltip when the decision has no time', () => {
    renderWithKibanaRenderContext(<ApprovalActorTime actorName="elastic" />);

    expect(screen.getByText('elastic')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
