/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ApplicationStart } from '@kbn/core/public';
import { RefStore } from './snapshot/ref_store';
import type { BuiltinToolDeps } from './types';

const visibleRect = { width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10, x: 0, y: 0 };

export const createDeps = (
  apps: Array<{ id: string; title: string; status?: number; visibleIn?: string[] }> = []
): BuiltinToolDeps => ({
  application: {
    currentAppId$: new BehaviorSubject<string | undefined>('discover'),
    applications$: new BehaviorSubject(
      new Map(
        apps.map((a) => [a.id, { status: 0, visibleIn: ['globalSearch'], ...a }] as [string, any])
      )
    ),
  } as unknown as ApplicationStart,
  refStore: new RefStore(),
});

export const callContext = (signal: AbortSignal = new AbortController().signal) => ({
  toolId: 't',
  toolCallId: 'c',
  executionId: 'e',
  agentId: 'a',
  signal,
});

/** Mocks layout APIs jsdom lacks; returns a restore function. */
export const mockLayout = (): (() => void) => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const originalCheck = proto.checkVisibility;
  const originalRect = Element.prototype.getBoundingClientRect;
  proto.checkVisibility = () => true;
  Element.prototype.getBoundingClientRect = () => visibleRect as DOMRect;
  return () => {
    if (originalCheck === undefined) {
      delete proto.checkVisibility;
    } else {
      proto.checkVisibility = originalCheck;
    }
    Element.prototype.getBoundingClientRect = originalRect;
    document.body.innerHTML = '';
  };
};
