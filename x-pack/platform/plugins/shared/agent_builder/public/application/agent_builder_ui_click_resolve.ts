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

/** Portaled UI uses `data-ebt-element` values with this prefix (Agent Builder contract only). */
const AGENT_BUILDER_EBT_ELEMENT_PREFIX = 'agentBuilder.';

function getEventTargetElement(event: MouseEvent): Element | null {
  const t = event.target;
  if (t instanceof Element) {
    return t;
  }
  if (t instanceof Text && t.parentElement) {
    return t.parentElement;
  }
  return null;
}

function hasAgentBuilderEbtContractOnPath(element: Element): boolean {
  for (let cur: Element | null = element; cur; cur = cur.parentElement) {
    const v = cur.getAttribute('data-ebt-element');
    if (v?.startsWith(AGENT_BUILDER_EBT_ELEMENT_PREFIX)) {
      return true;
    }
  }
  return false;
}

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

function findInteractiveAncestor(start: Element | null, boundary: HTMLElement): Element | null {
  for (let cur: Element | null = start; cur && boundary.contains(cur); cur = cur.parentElement) {
    if (isClickableTarget(cur)) {
      return cur;
    }
  }
  return null;
}

function collectEbtFromAncestors(
  interactive: Element,
  boundary: HTMLElement
): { ebt_element?: string; ebt_action?: string; ebt_detail?: string } {
  let ebtElement: string | undefined;
  let ebtAction: string | undefined;
  let ebtDetail: string | undefined;

  for (
    let cur: Element | null = interactive;
    cur && boundary.contains(cur);
    cur = cur.parentElement
  ) {
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
  mountRoot: HTMLElement,
  locationPathname: string
): ReportUiClickParams | null {
  if (event.button !== 0) {
    return null;
  }
  const startEl = getEventTargetElement(event);
  if (!startEl) {
    return null;
  }

  const insideMount = mountRoot.contains(startEl);
  if (!insideMount && !hasAgentBuilderEbtContractOnPath(startEl)) {
    return null;
  }

  const boundary: HTMLElement = insideMount ? mountRoot : document.body;
  if (!boundary.contains(startEl)) {
    return null;
  }

  const interactive = findInteractiveAncestor(startEl, boundary);
  if (!interactive) {
    return null;
  }
  if (isInteractiveDisabled(interactive)) {
    return null;
  }

  const ebt = collectEbtFromAncestors(interactive, boundary);
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
