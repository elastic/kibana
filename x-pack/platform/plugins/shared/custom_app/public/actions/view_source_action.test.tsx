/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { openLazyFlyout } from '@kbn/presentation-util';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import { getViewSourceAction } from './view_source_action';

jest.mock('../services', () => ({ getServices: () => ({ core: { name: 'core' } }) }));
jest.mock('@kbn/presentation-util', () => ({ openLazyFlyout: jest.fn() }));

const document: AppDocument = appDocumentSchema.parse({
  root: { type: 'heading', id: 'title', text: 'Service health' },
});

const panel = (extra: Record<string, unknown> = {}) => ({
  getDocument: () => document,
  uuid: 'panel-1',
  parentApi: { name: 'dashboard' },
  title$: new BehaviorSubject<string | undefined>('My panel'),
  hideTitle$: new BehaviorSubject<boolean | undefined>(false),
  ...extra,
});

const run = async (embeddable: unknown) => {
  const action = getViewSourceAction();
  await action.execute({ embeddable } as never);
  const { loadContent, flyoutProps, core, parentApi } = (openLazyFlyout as jest.Mock).mock
    .calls[0][0];
  const element = await loadContent({ closeFlyout: jest.fn(), ariaLabelledBy: 'title-id' });
  return { element, flyoutProps, core, parentApi };
};

describe('the View source panel action', () => {
  beforeEach(() => (openLazyFlyout as jest.Mock).mockReset());

  it('is an item of the panel menu named View source, with a code icon', () => {
    const action = getViewSourceAction();

    expect(action.getDisplayName?.({} as never)).toBe('View source');
    expect(action.getIconType?.({} as never)).toBe('code');
  });

  it('sits just before Inspect, which is the other way of seeing what a panel is made of', () => {
    expect(getViewSourceAction().order).toBe(18);
  });

  describe('which panels it is offered on', () => {
    it('is offered on a custom app panel', async () => {
      expect(await getViewSourceAction().isCompatible?.({ embeddable: panel() } as never)).toBe(
        true
      );
    });

    it.each([
      ['a panel of another kind', { uuid: 'x' }],
      ['nothing', undefined],
      ['null', null],
      ['a panel whose getDocument is not a function', { getDocument: 'nope' }],
    ])('is not offered on %s', async (_name, embeddable) => {
      expect(await getViewSourceAction().isCompatible?.({ embeddable } as never)).toBe(false);
    });

    it('refuses to run on a panel that is not a custom app', async () => {
      await expect(
        getViewSourceAction().execute({ embeddable: { uuid: 'x' } } as never)
      ).rejects.toBeInstanceOf(IncompatibleActionError);
      expect(openLazyFlyout).not.toHaveBeenCalled();
    });
  });

  describe('the flyout', () => {
    it('opens beside the dashboard, for this panel, with the dashboard that holds it', async () => {
      const { flyoutProps, core, parentApi } = await run(panel());

      expect(core).toEqual({ name: 'core' });
      expect(parentApi).toEqual({ name: 'dashboard' });
      expect(flyoutProps.focusedPanelId).toBe('panel-1');
    });

    it('shows the saved document of the panel, as JSON to read', async () => {
      const { element } = await run(panel());

      render(element);

      expect(screen.getByText(/"text": "Service health"/)).toBeInTheDocument();
      expect(screen.getByText(/"id": "title"/)).toBeInTheDocument();
    });

    it('says whose it is, and that it cannot be edited', async () => {
      const { element } = await run(panel());

      render(element);

      expect(screen.getByRole('heading', { name: 'Source of My panel' })).toBeInTheDocument();
      expect(screen.getByText(/It is read only/)).toBeInTheDocument();
    });

    it('is simply titled Source for a panel with no title', async () => {
      const { element } = await run(panel({ title$: undefined }));

      render(element);

      expect(screen.getByRole('heading', { name: 'Source' })).toBeInTheDocument();
    });

    it('shows the document as it is when the menu item is used, not as it was when the panel loaded', async () => {
      let current = document;
      const live = panel({ getDocument: () => current });
      const action = getViewSourceAction();
      await action.execute({ embeddable: live } as never);
      current = appDocumentSchema.parse({
        root: { type: 'heading', id: 'title', text: 'Edited since' },
      });

      const { loadContent } = (openLazyFlyout as jest.Mock).mock.calls[0][0];
      render(await loadContent({ closeFlyout: jest.fn(), ariaLabelledBy: 'x' }));

      expect(screen.getByText(/Edited since/)).toBeInTheDocument();
    });
  });
});
