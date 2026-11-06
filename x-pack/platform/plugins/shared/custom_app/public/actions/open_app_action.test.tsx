/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { getOpenAppAction } from './open_app_action';

const navigateToApp = jest.fn();
let mockCanShow = true;
jest.mock('../services', () => ({
  getServices: () => ({
    core: {
      application: { navigateToApp, capabilities: { customApp: { show: mockCanShow } } },
    },
  }),
}));

const linked = (id: string | undefined) => ({ getLibraryId: () => id });

/** Asks the action whether it is offered; the action must say, which the test insists on. */
const isOffered = async (embeddable: unknown): Promise<boolean> => {
  const { isCompatible } = getOpenAppAction();
  if (!isCompatible) throw new Error('The action must say whether it is offered');
  return isCompatible({ embeddable } as never);
};

describe('the Open app panel action', () => {
  const action = getOpenAppAction();

  beforeEach(() => {
    navigateToApp.mockReset().mockResolvedValue(undefined);
    mockCanShow = true;
  });

  describe('who it is offered to', () => {
    it('is offered to a panel that links to an app of the library', async () => {
      expect(await isOffered(linked('app-1'))).toBe(true);
    });

    it('is not offered to a panel with an app of its own: there is no page to open', async () => {
      expect(await isOffered(linked(undefined))).toBe(false);
    });

    it('is not offered to any other kind of panel, as it is on every panel menu', async () => {
      expect(await isOffered({ uuid: 'x' })).toBe(false);
      expect(await isOffered(undefined)).toBe(false);
    });

    it('is not offered to someone who cannot open the custom apps page', async () => {
      mockCanShow = false;

      expect(await isOffered(linked('app-1'))).toBe(false);
    });
  });

  it('opens the page of the app in another tab, so the dashboard stays as it is', async () => {
    await action.execute({ embeddable: linked('app-1') } as never);

    expect(navigateToApp).toHaveBeenCalledWith('customApp', {
      path: '/view/app-1',
      openInNewTab: true,
    });
  });

  it('writes the id so that it cannot change what the address means', async () => {
    await action.execute({ embeddable: linked('a/b?c') } as never);

    expect(navigateToApp).toHaveBeenCalledWith(
      'customApp',
      expect.objectContaining({ path: '/view/a%2Fb%3Fc' })
    );
  });

  it('refuses to run for a panel that does not link to an app', async () => {
    await expect(action.execute({ embeddable: linked(undefined) } as never)).rejects.toThrow(
      IncompatibleActionError
    );
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('is named and drawn as opening something elsewhere', () => {
    expect(action.getDisplayName?.({} as never)).toBe('Open app');
    expect(action.getIconType?.({} as never)).toBe('external');
  });
});
