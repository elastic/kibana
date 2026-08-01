/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ActionExecutionContext, VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { ACTION_VISUALIZE_LENS_FIELD } from '@kbn/ui-actions-plugin/public';
import { VISUALIZE_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { visualizeFieldAction } from './visualize_field_actions';
import { takeStoredVisualizeFieldContext } from './visualize_field_context_transfer';

const getServicesMock = () => {
  const navigateToApp = jest.fn().mockResolvedValue(undefined);
  const application = {
    navigateToApp,
    capabilities: { visualize_v2: { show: true } },
  } as unknown as ApplicationStart;
  const data = {
    query: {
      timefilter: { timefilter: { getTime: () => ({ from: 'now-15m', to: 'now' }) } },
      filterManager: { getGlobalFilters: () => [] },
    },
  } as unknown as DataPublicPluginStart;
  return { application, data, navigateToApp };
};

const context: VisualizeFieldContext = {
  fieldName: 'bytes',
  dataViewSpec: { id: 'test-data-view-id' },
  contextualFields: ['extension'],
  originatingApp: 'discover',
};

const executionContext = (
  extra: Partial<VisualizeFieldContext> = {}
): ActionExecutionContext<VisualizeFieldContext> => ({
  ...context,
  ...extra,
  trigger: { id: VISUALIZE_FIELD_TRIGGER },
});

describe('visualizeFieldAction', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('navigates in the current tab passing the context via history state', async () => {
    const { application, data, navigateToApp } = getServicesMock();

    await visualizeFieldAction(application, data).execute(executionContext());

    expect(navigateToApp).toHaveBeenCalledWith('lens', {
      state: { type: ACTION_VISUALIZE_LENS_FIELD, payload: executionContext() },
    });
    expect(takeStoredVisualizeFieldContext()).toBeUndefined();
  });

  it('navigates to a new tab passing the context via session storage', async () => {
    const { application, data, navigateToApp } = getServicesMock();
    let storedContextDuringNavigation: string | null = null;
    navigateToApp.mockImplementation(async () => {
      // window.open clones sessionStorage at this point, so the context must be stored
      storedContextDuringNavigation = window.sessionStorage.getItem('lens-visualize-field-context');
    });

    await visualizeFieldAction(application, data).execute(executionContext({ openInNewTab: true }));

    expect(navigateToApp).toHaveBeenCalledWith('lens', {
      path: `#/?_g=(filters:!(),time:(from:now-15m,to:now))`,
      openInNewTab: true,
      skipAppLeave: true,
    });
    expect(storedContextDuringNavigation).toBeDefined();
    expect(JSON.parse(storedContextDuringNavigation!)).toEqual({
      payload: executionContext({ openInNewTab: true }),
      originatingApp: 'discover',
    });
    // cleaned up after the new tab has been opened
    expect(window.sessionStorage.getItem('lens-visualize-field-context')).toBeNull();
  });
});

describe('takeStoredVisualizeFieldContext', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('reads the stored context only once', async () => {
    const { application, data, navigateToApp } = getServicesMock();
    navigateToApp.mockImplementation(async () => {
      // keep the stored context around, simulating the cloned session storage of a new tab
      expect(window.sessionStorage.getItem('lens-visualize-field-context')).toBeDefined();
      throw new Error('stop before cleanup');
    });

    await expect(
      visualizeFieldAction(application, data).execute(executionContext({ openInNewTab: true }))
    ).rejects.toThrow('stop before cleanup');

    expect(takeStoredVisualizeFieldContext()?.payload).toMatchObject({ fieldName: 'bytes' });
    expect(takeStoredVisualizeFieldContext()).toBeUndefined();
  });
});
