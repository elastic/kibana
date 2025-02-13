/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { AgentStatusBar } from './status_bar';

describe('AgentStatusBar', () => {
  it('should render the status bar if there is some agent displayed', () => {
    const renderer = createFleetTestRendererMock();
    const res = renderer.render(
      <AgentStatusBar
        agentStatus={
          {
            healthy: 10,
            inactive: 0,
            offline: 0,
          } as any
        }
      />
    );
    expect(res.queryByTestId('agentStatusBar')).not.toBeNull();
  });

  it('should not render the status bar if there is no agent displayed', () => {
    const renderer = createFleetTestRendererMock();
    const res = renderer.render(
      <AgentStatusBar
        agentStatus={
          {
            healthy: 0,
            inactive: 0,
            offline: 0,
          } as any
        }
      />
    );
    expect(res.queryByTestId('agentStatusBar')).toBeNull();
  });
});
