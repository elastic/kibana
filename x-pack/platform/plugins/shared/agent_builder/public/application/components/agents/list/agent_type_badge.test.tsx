/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import { AgentTypeBadge, isPreconfiguredAgentType } from './agent_type_badge';

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

const managedType = 'platform.sig_events.investigation-type';

describe('isPreconfiguredAgentType', () => {
  it('is false for the default chat agent type', () => {
    expect(isPreconfiguredAgentType(chatAgentTypeId)).toBe(false);
  });

  it('is false when the type is undefined', () => {
    expect(isPreconfiguredAgentType(undefined)).toBe(false);
  });

  it('is true for a non-chat agent type', () => {
    expect(isPreconfiguredAgentType(managedType)).toBe(true);
  });
});

describe('AgentTypeBadge', () => {
  it('renders nothing for the default chat agent type', () => {
    const { container } = renderWithIntl(<AgentTypeBadge agentType={chatAgentTypeId} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the type is undefined', () => {
    const { container } = renderWithIntl(<AgentTypeBadge agentType={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a Managed badge for an agent derived from a non-chat type', () => {
    renderWithIntl(<AgentTypeBadge agentType={managedType} />);

    expect(screen.getByTestId('agentBuilderAgentPreconfiguredTypeBadge')).toBeInTheDocument();
    expect(screen.getByText('Preconfigured')).toBeInTheDocument();
  });
});
