/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CaseAiWorkspaceProps } from '@kbn/agent-builder-browser';
import type { EmbeddableConversationDependencies } from '../embeddable/types';
import { CaseAiWorkspaceInternal } from './case_ai_workspace_internal';

export const createCaseAiWorkspace = ({
  services,
  coreStart,
}: EmbeddableConversationDependencies): React.FC<CaseAiWorkspaceProps> => {
  return (props: CaseAiWorkspaceProps) => (
    <CaseAiWorkspaceInternal {...props} services={services} coreStart={coreStart} />
  );
};
