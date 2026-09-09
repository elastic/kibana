/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { registerAutoAttach } from './auto_attach';
import type { AttachmentConverter } from '../../types';

export interface AutoAttachServices {
  chrome: ChromeStart;
  agentBuilder?: AgentBuilderPluginStart;
}

export const useAutoAttach = <FocusedItem>(
  item: FocusedItem | undefined,
  converter: AttachmentConverter<FocusedItem>,
  services: AutoAttachServices
): void => {
  const { chrome, agentBuilder } = services;

  const focusedItem$ = useRef(new BehaviorSubject<FocusedItem | undefined>(undefined)).current;

  const converterRef = useRef(converter);
  converterRef.current = converter;

  useEffect(() => {
    focusedItem$.next(item);
  }, [item, focusedItem$]);

  useEffect(() => {
    if (!agentBuilder) {
      return;
    }

    const teardown = registerAutoAttach({
      agentBuilder,
      chrome,
      focusedItem$,
      converter: converterRef.current,
    });

    return teardown;
  }, [agentBuilder, chrome, focusedItem$]);
};
