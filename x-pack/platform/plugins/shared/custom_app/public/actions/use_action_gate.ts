/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { listActionUiProviders, useActionUis } from '@kbn/custom-app-registry';
import type { Action } from '@kbn/custom-app-common';

/**
 * Why what a component does cannot be done yet, when an action of it needs something that is not
 * there: the person may not be allowed, or what it runs has not been saved yet. Without a reason it
 * can be used. A component whose actions need nothing is never held back.
 */
export const useActionGate = (actions: readonly Action[]): string | undefined => {
  const uis = useActionUis();
  const byType = useMemo(() => {
    const grouped = new Map<string, Action[]>();
    actions.forEach((action) => {
      grouped.set(action.type, [...(grouped.get(action.type) ?? []), action]);
    });
    return Array.from(grouped.entries());
  }, [actions]);

  useEffect(() => {
    byType.forEach(([type, ofType]) => uis[type]?.watch?.(ofType));
  }, [byType, uis]);

  const drawn = new Set(listActionUiProviders().map(([id]) => id));
  for (const [type, ofType] of byType) {
    // An action that has a part that is drawn cannot be done outside of an app that gives it one.
    if (drawn.has(type) && !uis[type]) {
      return i18n.translate('xpack.customApp.actions.notHere', {
        defaultMessage: 'This cannot be done from here.',
      });
    }
    const reason = uis[type]?.gate?.(ofType);
    if (reason) return reason;
  }
  return undefined;
};
