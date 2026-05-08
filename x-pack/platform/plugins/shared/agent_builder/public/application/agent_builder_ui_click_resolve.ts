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

function collectEbtFromAncestors(
  interactive: Element,
  root: HTMLElement
): { ebt_element?: string; ebt_action?: string; ebt_detail?: string } {
  let ebtElement: string | undefined;
  let ebtAction: string | undefined;
  let ebtDetail: string | undefined;

  for (let cur: Element | null = interactive; cur && root.contains(cur); cur = cur.parentElement) {
    if (!ebtElement) {
      const v = cur.getAttribute('data-ebt-element');
      if (v) {
        ebtElement = v;
      }
    }
    if (!ebtAction) {
      const v = cur.getAttribute('data-ebt-action');
      if (v) {
        ebtAction = v;
      }
    }
    if (!ebtDetail) {
      const v = cur.getAttribute('data-ebt-detail');
      if (v) {
        ebtDetail = v;
      }
    }
  }

  return {
    ...(ebtElement ? { ebt_element: ebtElement } : {}),
    ...(ebtAction ? { ebt_action: ebtAction } : {}),
    ...(ebtDetail ? { ebt_detail: ebtDetail } : {}),
  };
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

  const ebt = collectEbtFromAncestors(interactive, root);
  const ebtElement = ebt.ebt_element;
  if (!ebtElement) {
    return null;
  }

  return {
    ebt_element: ebtElement,
    ...(ebt.ebt_action ? { ebt_action: ebt.ebt_action } : {}),
    ...(ebt.ebt_detail ? { ebt_detail: ebt.ebt_detail } : {}),
    element_kind: classifyInteractiveKind(interactive),
    location_pathname: locationPathname,
  };
}
