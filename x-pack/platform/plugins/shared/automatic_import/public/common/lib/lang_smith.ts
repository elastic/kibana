/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ASSISTANT_NAMESPACE,
  TRACE_OPTIONS_SESSION_STORAGE_KEY,
} from '@kbn/elastic-assistant/impl/assistant_context/constants';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import type { LangSmithOptions } from '../../../common';

const sessionStorage = new Storage(window.sessionStorage);

/**
 * Retrieves the LangSmith options from the AI Settings.
 */
export const getLangSmithOptions = (
  nameSpace: string = DEFAULT_ASSISTANT_NAMESPACE
): LangSmithOptions | undefined => {
  // Get the LangSmith options stored by the AI Settings using the assistant context
  // TODO: Encapsulate all AI Settings logic in a generic place.
  const sessionStorageTraceOptions: TraceOptions = sessionStorage.get(
    `${nameSpace}.${TRACE_OPTIONS_SESSION_STORAGE_KEY}`
  );

  if (!sessionStorageTraceOptions) {
    return;
  }
  return {
    projectName: sessionStorageTraceOptions.langSmithProject,
    apiKey: sessionStorageTraceOptions.langSmithApiKey,
  };
};
