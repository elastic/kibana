/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentBuilderUiClickElementKind,
  ReportUiClickParams,
} from '@kbn/agent-builder-common/telemetry';

export function classifyInteractiveKind(el: Element): AgentBuilderUiClickElementKind {
  const role = el.getAttribute('role');
  if (role === 'button') {
    return 'role_button';
  }
  const tag = el.tagName;
  if (tag === 'A') {
    return 'link';
  }
  if (tag === 'BUTTON') {
    return 'button';
  }
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    if (type === 'button' || type === 'submit' || type === 'reset') {
      return 'input_button';
    }
  }
  return 'other';
}

export function isClickableTarget(el: Element): boolean {
  if (el.getAttribute('role') === 'button') {
    return true;
  }
  const tag = el.tagName;
  if (tag === 'BUTTON') {
    return true;
  }
  if (tag === 'A' && el.hasAttribute('href')) {
    return true;
  }
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return type === 'button' || type === 'submit' || type === 'reset';
  }
  return false;
}

/** Skip telemetry when the control is disabled or marked non-interactive. */
export function isInteractiveDisabled(el: Element): boolean {
  if (el.getAttribute('aria-disabled') === 'true') {
    return true;
  }
  try {
    if (el instanceof HTMLElement && el.matches(':disabled')) {
      return true;
    }
  } catch {
    // `:disabled` unsupported in some test environments for exotic nodes
  }
  return false;
}

function findInteractiveAncestor(start: Element | null, root: HTMLElement): Element | null {
  for (let cur: Element | null = start; cur && root.contains(cur); cur = cur.parentElement) {
    if (isClickableTarget(cur)) {
      return cur;
    }
  }
  return null;
}

function resolveNearestTestSubj(interactive: Element, root: HTMLElement): string {
  for (let cur: Element | null = interactive; cur && root.contains(cur); cur = cur.parentElement) {
    const dts = cur.getAttribute('data-test-subj');
    if (dts) {
      return dts;
    }
  }
  return 'unknown';
}

export function resolveAgentBuilderUiClickPayload(
  event: MouseEvent,
  root: HTMLElement,
  locationPathname: string
): ReportUiClickParams | null {
  if (event.button !== 0) {
    return null;
  }
  const rawTarget = event.target;
  if (!(rawTarget instanceof Element)) {
    return null;
  }
  if (!root.contains(rawTarget)) {
    return null;
  }

  const interactive = findInteractiveAncestor(rawTarget, root);
  if (!interactive) {
    return null;
  }
  if (isInteractiveDisabled(interactive)) {
    return null;
  }

  return {
    target_test_subj: resolveNearestTestSubj(interactive, root),
    element_kind: classifyInteractiveKind(interactive),
    location_pathname: locationPathname,
  };
}
