/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { createAssigneesChangedEventUiDefinition } from '.';

const renderEvent = (data: object, profiles: unknown[] | Error) => {
  const core = coreMock.createStart();
  if (profiles instanceof Error) {
    core.userProfile.bulkGet.mockRejectedValue(profiles);
  } else {
    core.userProfile.bulkGet.mockResolvedValue(profiles as never);
  }
  const definition = createAssigneesChangedEventUiDefinition({ core });
  const event = { id: 'e1', type: definition.type, data } as never;
  render(<I18nProvider>{definition.render(event, { conversationId: 'c1' })}</I18nProvider>);
  return core;
};

describe('assignees changed event UI definition', () => {
  it('resolves added and removed users to their current names', async () => {
    const core = renderEvent({ added: ['u1', 'u2'], removed: ['u3'] }, [
      { uid: 'u1', user: { username: 'jdoe', full_name: 'Jane Doe' } },
      { uid: 'u2', user: { username: 'bob' } },
      { uid: 'u3', user: { username: 'sam', full_name: 'Sam Smith' } },
    ]);

    expect(await screen.findByTestId('assigneesChangedEventAdded')).toHaveTextContent(
      'Assigned Jane Doe, bob'
    );
    expect(screen.getByTestId('assigneesChangedEventRemoved')).toHaveTextContent(
      'Unassigned Sam Smith'
    );
    expect(core.userProfile.bulkGet).toHaveBeenCalledWith(
      expect.objectContaining({ uids: new Set(['u1', 'u2', 'u3']) })
    );
  });

  it('omits the section with no changes', async () => {
    renderEvent({ added: ['u1'], removed: [] }, [{ uid: 'u1', user: { username: 'jdoe' } }]);

    expect(await screen.findByTestId('assigneesChangedEventAdded')).toBeInTheDocument();
    expect(screen.queryByTestId('assigneesChangedEventRemoved')).not.toBeInTheDocument();
  });

  it('falls back to the uid when a profile cannot be resolved', async () => {
    renderEvent({ added: [], removed: ['u3'] }, []);

    expect(await screen.findByTestId('assigneesChangedEventRemoved')).toHaveTextContent(
      'Unassigned u3'
    );
  });

  it('uses the user icon', () => {
    const definition = createAssigneesChangedEventUiDefinition({ core: coreMock.createStart() });
    const icon = (data: object) =>
      definition.getHeader?.({ data } as never, { conversationId: 'c1' })?.icon;

    expect(icon({ added: ['u1'], removed: [] })).toBe('user');
  });
});
