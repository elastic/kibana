/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger as PluginLogger, PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';
import { RulesSavedObjectServiceInternalToken } from '../../services/rules_saved_object_service/tokens';
import type { RulesSavedObjectServiceContract } from '../../services/rules_saved_object_service/rules_saved_object_service';
import { transformRuleSoAttributesToRuleApiResponse } from '../../rules_client/utils';
import { RuleDoctorWorkflowServiceToken } from '../../../workflows/tokens';
import type { RuleDoctorWorkflowService } from '../../../workflows/rule_doctor_workflow';
import type { AlertingServerStartDependencies } from '../../../types';
import {
  RuleDoctorSettingsProviderToken,
  type RuleDoctorSettingsProvider,
} from './constants';

interface RuleDoctorTaskState {
  runs: number;
  lastExecutionId: string | null;
  lastExecutionIds: string[];
}

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleDoctorTaskRunner {
  constructor(
    @inject(PluginLogger) private readonly logger: Logger,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RulesSavedObjectServiceInternalToken)
    private readonly rulesSoService: RulesSavedObjectServiceContract,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart,
    @inject(RuleDoctorWorkflowServiceToken)
    private readonly ruleDoctorService: RuleDoctorWorkflowService,
    @inject(RuleDoctorSettingsProviderToken)
    private readonly settingsProvider: RuleDoctorSettingsProvider
  ) {}

  public async run({ taskInstance }: TaskRunParams): Promise<RunResult> {
    const state = (taskInstance.state ?? {}) as Partial<RuleDoctorTaskState>;
    const runs = (state.runs ?? 0) + 1;
    let lastExecutionIds: string[] = state.lastExecutionIds ?? [];
    const spaceId = (taskInstance.params as { spaceId?: string }).spaceId ?? 'default';

    const { intervalHours, continuous } = await this.loadSettings();

    try {
      const namespace = this.spaces.spacesService.spaceIdToNamespace(spaceId);
      const result = await this.rulesSoService.find({
        page: 1,
        perPage: 1000,
        namespaces: namespace ? [namespace] : ['default'],
      });
      const rules = result.saved_objects.map((so) =>
        transformRuleSoAttributesToRuleApiResponse(so.id, so.attributes)
      );
      this.logger.info(`Rule Doctor fetched ${rules.length} rules for space ${spaceId}`);

      const executionIds = await this.ruleDoctorService.runAllAnalyses({
        request: this.request,
        rules,
        spaceId,
      });
      lastExecutionIds = executionIds;
      this.logger.info(
        `Rule Doctor analysis scheduled, ${executionIds.length} workflow executions: ${executionIds.join(', ')}`
      );
    } catch (e) {
      this.logger.error(
        `Error executing Rule Doctor analysis task: ${(e as Error).message}`,
        { error: { stack_trace: (e as Error).stack } }
      );
    }

    if (!continuous) {
      this.logger.info('Rule Doctor continuous mode is off; not rescheduling.');
      return {
        state: { runs, lastExecutionId: lastExecutionIds[0] ?? null, lastExecutionIds },
      };
    }

    return {
      state: { runs, lastExecutionId: lastExecutionIds[0] ?? null, lastExecutionIds },
      schedule: { interval: `${intervalHours}h` },
    };
  }

  private async loadSettings(): Promise<{ intervalHours: number; continuous: boolean }> {
    try {
      return await this.settingsProvider();
    } catch {
      return { intervalHours: 24, continuous: false };
    }
  }
}
