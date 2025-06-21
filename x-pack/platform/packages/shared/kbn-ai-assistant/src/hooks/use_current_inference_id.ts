/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKnowledgeBase } from './use_knowledge_base';

export const useCurrentInferenceId = () => {
  const knowledgeBase = useKnowledgeBase();
  return (
    knowledgeBase.status.value?.currentInferenceId ??
    knowledgeBase.status.value?.endpoint?.inference_id
  );
};
