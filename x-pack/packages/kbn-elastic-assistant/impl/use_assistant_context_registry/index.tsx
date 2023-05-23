/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useAssistantContext } from '../assistant_context';
import { PromptContext } from '../assistant/prompt_context/types';

export const useAssistantContextRegistry = (promptContext: PromptContext) => {
  const { registerPromptContext, unRegisterPromptContext } = useAssistantContext();

  useEffect(() => {
    registerPromptContext(promptContext);

    return () => unRegisterPromptContext(promptContext.id);
  }, [promptContext, registerPromptContext, unRegisterPromptContext]);
};
