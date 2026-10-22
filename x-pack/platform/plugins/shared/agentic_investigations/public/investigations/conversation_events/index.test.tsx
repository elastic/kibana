/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createStatusChangedEventUiDefinition } from '.';

const definition = createStatusChangedEventUiDefinition();

const renderEvent = (data: object) => {
  const event = { id: 'e1', type: definition.type, data } as never;
  render(<I18nProvider>{definition.render(event, { conversationId: 'c1' })}</I18nProvider>);
};

describe('status changed event UI definition', () => {
  it('renders a status change', () => {
    renderEvent({ from: 'open', to: 'closed' });

    expect(screen.getByTestId('statusChangedEvent')).toHaveTextContent(
      'Status changed from Open to Closed'
    );
  });

  it('renders a first status without a previous one', () => {
    renderEvent({ to: 'open' });

    expect(screen.getByTestId('statusChangedEvent')).toHaveTextContent('Status set to Open');
  });

  it('uses the user icon', () => {
    const icon = (data: object) =>
      definition.getHeader?.({ data } as never, { conversationId: 'c1' })?.icon;

    expect(icon({ to: 'closed' })).toBe('user');
    expect(icon({ to: 'open' })).toBe('user');
  });
});
