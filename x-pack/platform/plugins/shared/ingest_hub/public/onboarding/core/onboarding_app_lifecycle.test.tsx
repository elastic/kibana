/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { of } from 'rxjs';

// Real session storage and real `useSessionStorage` on purpose: these tests are about what the
// mounted persistence hooks do to storage while the app is torn down.

jest.mock('@kbn/fleet-plugin/public', () => {
  const passthrough = ({ children }: { children: React.ReactNode }) => children;
  return {
    sendGetCloudOnboardingDeployment: jest.fn(),
    FleetStatusProvider: passthrough,
    FlyoutContextProvider: passthrough,
    KibanaVersionContext: { Provider: passthrough },
  };
});

jest.mock('../onboarding_flow_context', () => ({
  OnboardingFlowProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Stands in for the shell: persists a value with the real hook, and cancels the flow the way the
// shell does, by marking the session for discard, and re-renders so the hook writes it back.
jest.mock('./onboarding_shell', () => {
  const mockReact = jest.requireActual('react');
  const useSessionStorage = jest.requireActual('react-use/lib/useSessionStorage').default;
  const { discardSessionOnUnmount } = jest.requireActual('./onboarding_session_storage');
  return {
    OnboardingShell: () => {
      const [value, setValue] = useSessionStorage('onboarding.aws.stepState', 'initial');
      return mockReact.createElement('button', {
        'data-test-subj': 'cancelFlow',
        onClick: () => {
          discardSessionOnUnmount('aws');
          setValue(`${value}-rewritten`);
        },
      });
    },
  };
});

import { renderOnboardingApp } from './onboarding_app';
import { getReturnUrl } from './return_url';

const STEP_STATE_KEY = 'onboarding.aws.stepState';

function setup(initialEntry: Array<string | { pathname: string; hash: string; state?: unknown }>) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const history = createMemoryHistory({ initialEntries: initialEntry });
  const coreStart = {
    rendering: { addContext: (node: React.ReactNode) => node },
    theme: { theme$: of({ darkMode: false }), getTheme: () => ({ darkMode: false }) },
  };
  const deps = { fleet: { authz: {} }, cloud: undefined, spaces: undefined };

  const mount = async () => {
    let unmount: () => void = () => {};
    await act(async () => {
      unmount = await renderOnboardingApp(
        coreStart as any,
        { history, element } as any,
        deps as any,
        '9.9.0'
      );
    });
    return unmount;
  };

  return { element, mount };
}

describe('renderOnboardingApp — lifecycle', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps a cancelled flow cleared after teardown, although the hooks write it back first', async () => {
    const { element, mount } = setup(['/aws#services']);
    const unmount = await mount();
    expect(sessionStorage.getItem(STEP_STATE_KEY)).toBe('"initial"');

    // Cancel: the session is only marked, the mounted hook rewrites its value on re-render.
    await act(async () => {
      element.querySelector<HTMLElement>('[data-test-subj="cancelFlow"]')!.click();
    });
    expect(sessionStorage.getItem(STEP_STATE_KEY)).toBe('"initial-rewritten"');

    // Teardown clears it for good.
    act(() => unmount());
    expect(sessionStorage.getItem(STEP_STATE_KEY)).toBeNull();
  });

  it('leaves the session alone on a normal teardown', async () => {
    const { mount } = setup(['/aws#services']);
    const unmount = await mount();

    act(() => unmount());
    expect(sessionStorage.getItem(STEP_STATE_KEY)).toBe('"initial"');
  });

  it('stores the page the flow was opened from', async () => {
    const { mount } = setup([
      {
        pathname: '/aws',
        hash: '#services',
        state: { newSession: true, returnUrl: '/app/integrations/browse?q=aws' },
      },
    ]);
    const unmount = await mount();

    expect(getReturnUrl('aws')).toBe('/app/integrations/browse?q=aws');
    act(() => unmount());
  });
});
