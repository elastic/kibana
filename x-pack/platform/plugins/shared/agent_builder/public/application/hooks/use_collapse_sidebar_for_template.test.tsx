/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { useCollapseSidebarForTemplate } from './use_collapse_sidebar_for_template';
import { useSidebarCollapsed } from './use_sidebar_collapsed';
import { useConversation } from './use_conversation';

jest.mock('./use_conversation');

const setConversation = (conversation?: { id: string; template_id?: string }) =>
  jest
    .mocked(useConversation)
    .mockReturnValue({ conversation } as ReturnType<typeof useConversation>);

const render = () => {
  const history = createMemoryHistory({ initialEntries: ['/agents/a/conversations/c1'] });
  const view = renderHook(
    () => {
      const sidebar = useSidebarCollapsed();
      useCollapseSidebarForTemplate();
      return sidebar;
    },
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Router history={history}>{children}</Router>
      ),
    }
  );
  return { history, view };
};

describe('useCollapseSidebarForTemplate', () => {
  it('collapses the list for a conversation with a template and leaves the URL clean', () => {
    setConversation({ id: 'c1', template_id: 'investigation' });

    const { history, view } = render();

    expect(view.result.current[0]).toBe(true);
    expect(history.location.search).toBe('');
  });

  it('leaves the list open for a plain conversation', () => {
    setConversation({ id: 'c1' });

    const { view } = render();

    expect(view.result.current[0]).toBe(false);
  });

  it('does not collapse it again once a person has opened it', () => {
    setConversation({ id: 'c1', template_id: 'investigation' });
    const { view } = render();
    act(() => view.result.current[1](false));

    view.rerender();

    expect(view.result.current[0]).toBe(false);
  });
});
