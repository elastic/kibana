/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/ui-chrome-layout-constants';
import {
  AGENT_WORKSPACE_MOUNT_TEST_SUBJ,
  createAgentWorkspaceFlyoutDefaults,
  getApplicationWorkspaceMountElement,
  resolveAgentWorkspaceFlyoutContainer,
} from './agent_workspace_flyout_defaults';

describe('agent_workspace_flyout_defaults', () => {
  describe('getApplicationWorkspaceMountElement', () => {
    it('returns the application workspace scroll container when present', () => {
      const mountRoot = document.createElement('div');
      mountRoot.id = APP_MAIN_SCROLL_CONTAINER_ID;
      document.body.appendChild(mountRoot);

      expect(getApplicationWorkspaceMountElement()).toBe(mountRoot);

      document.body.removeChild(mountRoot);
    });

    it('returns null when the application workspace scroll container is absent', () => {
      expect(getApplicationWorkspaceMountElement()).toBeNull();
    });
  });

  describe('resolveAgentWorkspaceFlyoutContainer', () => {
    it('returns the agent workspace mount root when present', () => {
      const mountRoot = document.createElement('div');
      mountRoot.setAttribute('data-test-subj', AGENT_WORKSPACE_MOUNT_TEST_SUBJ);
      const appRoot = document.createElement('div');
      mountRoot.appendChild(appRoot);
      document.body.appendChild(mountRoot);

      expect(resolveAgentWorkspaceFlyoutContainer(appRoot)).toBe(mountRoot);

      document.body.removeChild(mountRoot);
    });

    it('falls back to the parent element when mount root is absent', () => {
      const parent = document.createElement('div');
      const appRoot = document.createElement('div');
      parent.appendChild(appRoot);

      expect(resolveAgentWorkspaceFlyoutContainer(appRoot)).toBe(parent);
    });
  });

  describe('createAgentWorkspaceFlyoutDefaults', () => {
    it('scopes flyouts to the provided container', () => {
      const container = document.createElement('div');

      expect(createAgentWorkspaceFlyoutDefaults(container)).toEqual({
        EuiFlyout: { container },
      });
    });

    it('returns undefined when no container is provided', () => {
      expect(createAgentWorkspaceFlyoutDefaults(null)).toBeUndefined();
    });
  });
});
