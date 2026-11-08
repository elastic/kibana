/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentPermissions } from '../../../../common/http_api/agents';

type AgentWithOptionalPermissions = AgentDefinition & { permissions?: AgentPermissions };

export const useCanUpdateAgentApprovals = (
  agent: AgentWithOptionalPermissions | null | undefined
): boolean => useMemo(() => agent?.permissions?.update_approvals ?? false, [agent]);
