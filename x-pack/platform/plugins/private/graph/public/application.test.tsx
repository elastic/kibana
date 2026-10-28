/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { scopedHistoryMock } from '@kbn/core/public/mocks';
import type { Capabilities } from '@kbn/core/public';
import type { GraphDependencies } from './application';
import { renderApp } from './application';

jest.mock('react-dom', () => ({
  render: jest.fn(),
  unmountComponentAtNode: jest.fn(),
}));

// Skip the licensing redirect branch — it is not what this test exercises.
jest.mock('../common/check_license', () => ({
  checkLicense: () => ({ showAppLink: true, enableAppLink: true }),
}));

const buildDeps = ({ canSave }: { canSave: boolean }): GraphDependencies => {
  const core = coreMock.createStart();
  const history = scopedHistoryMock.create();
  history.listen.mockReturnValue(() => {});

  const capabilities = {
    navLinks: {},
    management: {},
    catalogue: {},
    graph: { save: canSave, delete: canSave, show: true },
  } as unknown as Capabilities;

  return {
    core,
    coreStart: core,
    chrome: core.chrome,
    capabilities,
    licensing: licensingMock.createStart(),
    history,
    element: document.createElement('div'),
    // The remaining deps are spread into JSX that `react-dom` would render,
    // but we mock `react-dom.render` so they are never touched at runtime.
  } as unknown as GraphDependencies;
};

describe('renderApp - read-only badge', () => {
  it('sets the chrome badge when `capabilities.graph.save` is false', () => {
    const deps = buildDeps({ canSave: false });

    renderApp(deps);

    expect(deps.chrome.setBadge).toHaveBeenCalledTimes(1);
    expect(deps.chrome.setBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Read only',
        iconType: 'readOnly',
      })
    );
  });

  it('does not set the chrome badge when `capabilities.graph.save` is true', () => {
    const deps = buildDeps({ canSave: true });

    renderApp(deps);

    expect(deps.chrome.setBadge).not.toHaveBeenCalled();
  });
});
