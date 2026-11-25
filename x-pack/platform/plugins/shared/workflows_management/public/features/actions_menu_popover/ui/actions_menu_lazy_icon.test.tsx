/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ActionsMenu } from './actions_menu';
import type { ActionGroup, ActionOption, ActionOptionData } from '../types';

// EUI's test build draws every icon as an empty span. The real icon draws a component given as its
// `type` (that is how a lazy icon suspends), so this stand-in does the same.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const MockReact = jest.requireActual('react');
  return {
    ...actual,
    EuiIcon: ({ type }: { type: unknown }) =>
      typeof type === 'string'
        ? MockReact.createElement('span', { 'data-euiicon-type': type })
        : MockReact.createElement(type),
  };
});

jest.mock('../../../hooks/use_kibana');

jest.mock('../../validate_workflow_yaml/model/use_workflow_json_schema', () => ({
  useWorkflowJsonSchema: () => ({ jsonSchema: {}, uri: null }),
}));

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="mocked-step-icon" />,
}));

/** An icon that is still being fetched: it suspends for as long as the test runs. */
const mockPendingIcon = React.lazy(() => new Promise<never>(() => {}));

const mockStepWithLazyIcon: ActionOption = {
  id: 'cases.createCase',
  label: 'Create case',
  description: 'Open a case',
  // Registered steps may give their icon as a lazy component, loaded on demand.
  iconType: mockPendingIcon as unknown as string,
};

const mockCasesGroup: ActionGroup = {
  id: 'cases',
  label: 'Cases',
  description: 'Work with cases',
  iconType: 'briefcase',
  options: [mockStepWithLazyIcon],
};

const mockOptions: ActionOptionData[] = [mockCasesGroup];

jest.mock('../lib/get_action_options', () => ({
  getActionOptions: jest.fn(() => mockOptions),
  getIconGlyphColor: jest.fn(() => undefined),
  flattenOptions: jest.fn((items: ActionOptionData[]) =>
    items.flatMap((item) => ('options' in item ? [item, ...item.options] : [item]))
  ),
}));

describe('ActionsMenu, while the icon of a step is still loading', () => {
  beforeAll(() => {
    // jsdom has no layout, so no scrolling: the menu scrolls the active row into view.
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('keeps the menu on screen when a category is hovered and its steps are previewed', async () => {
    // The same shape as the lazy popover: one boundary around the whole menu, which shows nothing.
    render(
      <I18nProvider>
        <React.Suspense fallback={null}>
          <ActionsMenu onActionSelected={jest.fn()} />
        </React.Suspense>
      </I18nProvider>
    );
    expect(screen.getByText('Actions menu')).toBeVisible();

    await act(async () => {
      fireEvent.mouseMove(screen.getByText('Cases'));
    });

    // A boundary that hides the menu would make the modal fade in again once the icon arrives.
    expect(screen.getByText('Actions menu')).toBeVisible();
    // The row and the preview's title.
    screen.getAllByText('Cases').forEach((element) => expect(element).toBeVisible());
  });
});
