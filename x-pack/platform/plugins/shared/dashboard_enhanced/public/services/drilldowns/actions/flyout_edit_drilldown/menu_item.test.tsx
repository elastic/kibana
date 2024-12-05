/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { createStateContainer } from '@kbn/kibana-utils-plugin/public';
import { SerializedEvent } from '@kbn/ui-actions-enhanced-plugin/common';
import { UiActionsEnhancedDynamicActionManager as DynamicActionManager } from '@kbn/ui-actions-enhanced-plugin/public';
import { act, render } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { FlyoutEditDrilldownActionApi } from './flyout_edit_drilldown';
import { MenuItem } from './menu_item';

test('<MenuItem/>', () => {
  const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>({
    dynamicActions: { events: [] },
  });

  const state = createStateContainer<{ events: SerializedEvent[] }>({ events: [] });
  const context = {
    embeddable: {
      enhancements: {
        dynamicActions: { state } as unknown as DynamicActionManager,
      },
      dynamicActionsState$,
    } as unknown as FlyoutEditDrilldownActionApi,
    trigger: {},
  };
  const { getByText, queryByText } = render(<MenuItem context={context} />);

  expect(getByText(/manage drilldowns/i)).toBeInTheDocument();
  expect(queryByText('0')).not.toBeInTheDocument();

  act(() => {
    dynamicActionsState$.next({
      dynamicActions: { events: [{} as SerializedEvent] },
    });
  });

  expect(queryByText('1')).toBeInTheDocument();
});
