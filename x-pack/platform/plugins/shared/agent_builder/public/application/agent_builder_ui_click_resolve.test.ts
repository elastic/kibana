/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  classifyInteractiveKind,
  isClickableTarget,
  isInteractiveDisabled,
  resolveAgentBuilderUiClickPayload,
} from './agent_builder_ui_click_resolve';

describe('agent_builder_ui_click_resolve', () => {
  describe('classifyInteractiveKind', () => {
    it('classifies button', () => {
      const el = document.createElement('button');
      expect(classifyInteractiveKind(el)).toBe('button');
    });

    it('classifies link with href', () => {
      const el = document.createElement('a');
      el.setAttribute('href', '#');
      expect(classifyInteractiveKind(el)).toBe('link');
    });

    it('classifies role=button', () => {
      const el = document.createElement('div');
      el.setAttribute('role', 'button');
      expect(classifyInteractiveKind(el)).toBe('role_button');
    });
  });

  describe('isClickableTarget', () => {
    it('returns false for bare div', () => {
      expect(isClickableTarget(document.createElement('div'))).toBe(false);
    });

    it('returns true for anchor with href', () => {
      const a = document.createElement('a');
      a.setAttribute('href', '/x');
      expect(isClickableTarget(a)).toBe(true);
    });
  });

  describe('isInteractiveDisabled', () => {
    it('returns true for disabled button', () => {
      const btn = document.createElement('button');
      btn.disabled = true;
      expect(isInteractiveDisabled(btn)).toBe(true);
    });

    it('returns true when aria-disabled is true', () => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-disabled', 'true');
      expect(isInteractiveDisabled(btn)).toBe(true);
    });
  });

  describe('resolveAgentBuilderUiClickPayload', () => {
    let root: HTMLElement;

    beforeEach(() => {
      root = document.createElement('div');
      document.body.appendChild(root);
    });

    afterEach(() => {
      root.remove();
    });

    function clickEvent(target: Element, button = 0) {
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true, button });
      Object.defineProperty(ev, 'target', { value: target, enumerable: true });
      return ev;
    }

    it('returns null when button is not primary', () => {
      const btn = document.createElement('button');
      btn.setAttribute('data-ebt-element', 'x');
      root.appendChild(btn);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(btn, 2), root, '/agents')).toBeNull();
    });

    it('returns null when no interactive ancestor', () => {
      const span = document.createElement('span');
      root.appendChild(span);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(span), root, '/agents')).toBeNull();
    });

    it('returns null when interactive control is disabled', () => {
      const btn = document.createElement('button');
      btn.disabled = true;
      btn.setAttribute('data-ebt-element', 'disabledBtn');
      root.appendChild(btn);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(btn), root, '/agents')).toBeNull();
    });

    it('returns null when no data-ebt-element on the path (test subj alone is ignored)', () => {
      const btn = document.createElement('button');
      btn.setAttribute('data-test-subj', 'mySaveBtn');
      root.appendChild(btn);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(btn), root, '/manage/agents')).toBeNull();
    });

    it('uses data-ebt-element on the button', () => {
      const btn = document.createElement('button');
      btn.setAttribute('data-ebt-element', 'mySaveBtn');
      root.appendChild(btn);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(btn), root, '/manage/agents')).toEqual({
        ebt_element: 'mySaveBtn',
        element_kind: 'button',
        location_pathname: '/manage/agents',
      });
    });

    it('walks up to nearest data-ebt-element', () => {
      const wrap = document.createElement('div');
      wrap.setAttribute('data-ebt-element', 'panelActions');
      const btn = document.createElement('button');
      wrap.appendChild(btn);
      root.appendChild(wrap);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(btn), root, '/')).toEqual({
        ebt_element: 'panelActions',
        element_kind: 'button',
        location_pathname: '/',
      });
    });

    it('prefers closest data-ebt-element over outer ancestors', () => {
      root.setAttribute('data-ebt-element', 'outer');
      const wrap = document.createElement('div');
      wrap.setAttribute('data-ebt-element', 'inner');
      const btn = document.createElement('button');
      wrap.appendChild(btn);
      root.appendChild(wrap);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(btn), root, '/skills')).toEqual({
        ebt_element: 'inner',
        element_kind: 'button',
        location_pathname: '/skills',
      });
    });

    it('includes data-ebt-action and data-ebt-detail when present', () => {
      const wrap = document.createElement('div');
      wrap.setAttribute('data-ebt-element', 'skillsPanel');
      wrap.setAttribute('data-ebt-action', 'openLibrary');
      wrap.setAttribute('data-ebt-detail', 'v1');
      const btn = document.createElement('button');
      wrap.appendChild(btn);
      root.appendChild(wrap);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(btn), root, '/skills')).toEqual({
        ebt_element: 'skillsPanel',
        ebt_action: 'openLibrary',
        ebt_detail: 'v1',
        element_kind: 'button',
        location_pathname: '/skills',
      });
    });

    it('classifies link with href', () => {
      const a = document.createElement('a');
      a.setAttribute('href', 'https://example.com');
      a.setAttribute('data-ebt-element', 'docLink');
      root.appendChild(a);
      expect(resolveAgentBuilderUiClickPayload(clickEvent(a), root, '/x')).toEqual({
        ebt_element: 'docLink',
        element_kind: 'link',
        location_pathname: '/x',
      });
    });

    it('resolves portaled clicks when path has agentBuilder. data-ebt-element', () => {
      const portal = document.createElement('div');
      document.body.appendChild(portal);
      const btn = document.createElement('button');
      btn.setAttribute('data-ebt-element', 'agentBuilder.test.portal');
      portal.appendChild(btn);
      try {
        expect(resolveAgentBuilderUiClickPayload(clickEvent(btn), root, '/agents')).toEqual({
          ebt_element: 'agentBuilder.test.portal',
          element_kind: 'button',
          location_pathname: '/agents',
        });
      } finally {
        portal.remove();
      }
    });

    it('returns null for clicks outside mount when no agentBuilder. data-ebt-element on path', () => {
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      const btn = document.createElement('button');
      btn.setAttribute('data-ebt-element', 'other.widget');
      outside.appendChild(btn);
      try {
        expect(
          resolveAgentBuilderUiClickPayload(clickEvent(btn), root, '/manage/tools')
        ).toBeNull();
      } finally {
        outside.remove();
      }
    });
  });
});
