/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowBudgetAdmissionGuard } from './workflow_admission_guard';

describe('createWorkflowBudgetAdmissionGuard', () => {
  const findByAutomation = jest.fn();
  const checkAdmission = jest.fn();
  const guard = createWorkflowBudgetAdmissionGuard({
    getAiIndexService: () => ({ findByAutomation }),
    getBudgetService: () => ({ checkAdmission }),
  });
  const request = { workflowId: 'wf-1', spaceId: 'default', triggeredBy: 'scheduled' };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('admits workflows that are not an AI index automation', async () => {
    findByAutomation.mockResolvedValue(undefined);

    await expect(guard(request)).resolves.toEqual({ admitted: true });
    expect(checkAdmission).not.toHaveBeenCalled();
  });

  it('checks the automations budget of the owning AI index', async () => {
    findByAutomation.mockResolvedValue('tickets');
    checkAdmission.mockResolvedValue({ admitted: false, reason: 'spent' });

    await expect(guard(request)).resolves.toEqual({ admitted: false, reason: 'spent' });
    expect(findByAutomation).toHaveBeenCalledWith('wf-1', 'default');
    expect(checkAdmission).toHaveBeenCalledWith({
      bucket: 'automations',
      spaceId: 'default',
      aiIndexId: 'tickets',
    });
  });
});
