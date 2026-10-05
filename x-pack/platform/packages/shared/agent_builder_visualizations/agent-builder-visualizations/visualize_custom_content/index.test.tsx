/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { VisualizeCustomContent } from '.';
import type { VisualizationServices } from '../services';

jest.mock('@kbn/custom-content-renderer', () => ({
  CustomContentComponent: () => <span data-test-subj="custom-content" />,
}));

jest.mock('../shared/use_vis_preview_unified_search', () => ({
  useVisPreviewUnifiedSearch: () => ({
    searchBarProps: {},
    effectiveTimeRange: { from: 'now-15m', to: 'now' },
  }),
}));

let capturedOnSave: ((args: Record<string, unknown>) => void) | undefined;
jest.mock('@kbn/presentation-util-plugin/public', () => ({
  SavedObjectSaveModalDashboard: (props: { onSave: (args: Record<string, unknown>) => void }) => {
    capturedOnSave = props.onSave;
    return <span data-test-subj="save-modal" />;
  },
}));

const navigateToWithEmbeddablePackages = jest.fn();

const createServices = (canWriteDashboards = true) =>
  ({
    application: { capabilities: { dashboard_v2: { showWriteControls: canWriteDashboards } } },
    unifiedSearch: { ui: { SearchBar: () => <span data-test-subj="search-bar" /> } },
    embeddable: { getStateTransfer: () => ({ navigateToWithEmbeddablePackages }) },
    customContent: {},
  } as unknown as VisualizationServices);

const visualization = { template: '<div>board</div>', height: 420 };

const renderComponent = (
  props: Partial<React.ComponentProps<typeof VisualizeCustomContent>> = {}
) => {
  const buttons: ActionButton[] = [];
  render(
    <EuiProvider>
      <VisualizeCustomContent
        services={createServices()}
        visualization={visualization}
        esql="FROM logs"
        registerActionButtons={(registered) => buttons.splice(0, buttons.length, ...registered)}
        {...props}
      />
    </EuiProvider>
  );
  return buttons;
};

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnSave = undefined;
});

describe('VisualizeCustomContent', () => {
  it('saves without a time range so the panel follows the dashboard', async () => {
    const buttons = renderComponent();
    buttons.find((button) => button.icon === 'save')!.handler();
    await screen.findByTestId('save-modal');

    capturedOnSave!({ dashboardId: 'dash-1', newTitle: 'Board', newDescription: '' });

    expect(navigateToWithEmbeddablePackages).toHaveBeenCalledWith(
      'dashboards',
      expect.objectContaining({
        state: [
          expect.objectContaining({
            type: 'custom_content',
            serializedState: {
              template: '<div>board</div>',
              esql_query: ['FROM logs'],
              title: 'Board',
              description: '',
            },
          }),
        ],
      })
    );
  });

  it('disables saving without dashboard write permissions', () => {
    const buttons = renderComponent({ services: createServices(false) });

    expect(buttons.find((button) => button.icon === 'save')).toMatchObject({
      disabled: true,
      disabledReason: expect.any(String),
    });
  });

  it('registers no actions until a template exists', () => {
    expect(renderComponent({ visualization: {} })).toEqual([]);
  });

  // A static panel has no query to re-range, so the picker would be a control that does nothing.
  it('only shows the time picker when the panel is query-backed', () => {
    renderComponent();
    expect(screen.getByTestId('search-bar')).toBeTruthy();

    screen.getByTestId('search-bar').remove();
    renderComponent({ esql: undefined });
    expect(screen.queryByTestId('search-bar')).toBeNull();
  });
});
