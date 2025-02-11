/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAssignees } from '../../../common/types/domain';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

export interface NotifyAssigneesArgs {
  assignees: CaseAssignees;
  theCase: CaseSavedObjectTransformed;
}

export interface NotificationService {
  notifyAssignees: (args: NotifyAssigneesArgs) => Promise<void>;
  bulkNotifyAssignees: (args: NotifyAssigneesArgs[]) => Promise<void>;
}
