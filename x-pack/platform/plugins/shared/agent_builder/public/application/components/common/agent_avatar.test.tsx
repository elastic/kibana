/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { AgentAvatar } from './agent_avatar';

const builtInAgent: AgentDefinition = {
  id: 'agent-1',
  type: 'chat',
  name: 'Threat Hunting Agent',
  description: '',
  readonly: true,
  configuration: {
    tools: [],
  },
};

describe('AgentAvatar', () => {
  it('centers icon avatars in a square matching the requested avatar size', () => {
    render(<AgentAvatar agent={builtInAgent} size="s" />);

    expect(screen.getByTestId('agentBuilderAgentIconAvatar')).toHaveStyleRule(
      'inline-size',
      '24px'
    );
    expect(screen.getByTestId('agentBuilderAgentIconAvatar')).toHaveStyleRule('block-size', '24px');
    expect(screen.getByTestId('agentBuilderAgentIconAvatar')).toHaveStyleRule('display', 'flex');
    expect(screen.getByTestId('agentBuilderAgentIconAvatar')).toHaveStyleRule(
      'align-items',
      'center'
    );
    expect(screen.getByTestId('agentBuilderAgentIconAvatar')).toHaveStyleRule(
      'justify-content',
      'center'
    );
  });
});
