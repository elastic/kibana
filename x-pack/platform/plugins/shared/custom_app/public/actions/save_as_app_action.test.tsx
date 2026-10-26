/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { getSaveAsAppAction } from './save_as_app_action';

const create = jest.fn();
const addSuccess = jest.fn();
const addDanger = jest.fn();
let mockCanSave = true;

jest.mock('../application/saved_apps_client', () => ({
  createSavedAppsClient: () => ({ create: (...args: unknown[]) => create(...args) }),
}));
jest.mock('@kbn/react-kibana-mount', () => ({ toMountPoint: (node: unknown) => node }));
jest.mock('../services', () => ({
  getServices: () => ({
    core: {
      http: {},
      application: {
        capabilities: { customApp: { save: mockCanSave } },
        navigateToApp: jest.fn(),
      },
      notifications: { toasts: { addSuccess, addDanger } },
    },
  }),
}));

const panel = (overrides: Record<string, unknown> = {}) => ({
  type: 'custom_content',
  serializeState: () => ({ esql_query: ['FROM logs | LIMIT 3'], template: '<p>hi</p>' }),
  applySerializedState: jest.fn(),
  anyStateChange$: {},
  latestState$: {},
  title$: { getValue: () => 'My board' },
  ...overrides,
});

const { isCompatible, execute } = getSaveAsAppAction();
if (!isCompatible || !execute) throw new Error('The action must say whether it is offered');
const action = {
  isCompatible: (context: unknown) => isCompatible(context as never),
  execute: (context: unknown) => execute(context as never),
};

describe('the save as custom app action', () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: 'new-app' });
    addSuccess.mockReset();
    addDanger.mockReset();
    mockCanSave = true;
  });

  it('is offered for a custom content panel, to someone who may save apps', async () => {
    expect(await action.isCompatible({ embeddable: panel() })).toBe(true);
    mockCanSave = false;
    expect(await action.isCompatible({ embeddable: panel() })).toBe(false);
  });

  it('is not offered for any other panel', async () => {
    mockCanSave = true;
    expect(await action.isCompatible({ embeddable: panel({ type: 'lens' }) })).toBe(false);
    expect(await action.isCompatible({ embeddable: {} })).toBe(false);
  });

  it('refuses a panel it is not for', async () => {
    await expect(action.execute({ embeddable: panel({ type: 'lens' }) })).rejects.toThrow(
      IncompatibleActionError
    );
  });

  it('saves an app with the content of the panel, named by its title, and says so', async () => {
    await action.execute({ embeddable: panel() });

    expect(create).toHaveBeenCalledTimes(1);
    const [input] = create.mock.calls[0];
    expect(input.title).toBe('Custom content');
    expect(JSON.stringify(input.document)).toContain('<p>hi</p>');
    expect(JSON.stringify(input.document)).toContain('FROM logs | LIMIT 3');
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Saved as the custom app "Custom content"' })
    );
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('says why when the panel has no content yet, and saves nothing', async () => {
    await action.execute({
      embeddable: panel({ serializeState: () => ({ esql_query: ['FROM logs'] }) }),
    });

    expect(create).not.toHaveBeenCalled();
    expect(addDanger).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'This panel has no content yet.' })
    );
  });

  it('says why when the app could not be saved', async () => {
    create.mockRejectedValue({ body: { message: 'Too much' } });

    await action.execute({ embeddable: panel() });

    expect(addDanger).toHaveBeenCalledWith(expect.objectContaining({ text: 'Too much' }));
    expect(addSuccess).not.toHaveBeenCalled();
  });
});
