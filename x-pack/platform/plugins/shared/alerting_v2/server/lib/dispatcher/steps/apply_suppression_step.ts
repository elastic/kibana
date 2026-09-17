/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { EpisodeScan, EpisodeTriage, SuppressionIndex } from '../state';
import type { DispatcherPipelineState, DispatcherStep, DispatcherStepOutput } from '../types';

@injectable()
export class ApplySuppressionStep implements DispatcherStep {
  public readonly name = 'apply_suppression';

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    _: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const { scan = EpisodeScan.empty(), suppressions = SuppressionIndex.empty() } = state;

    const triage = EpisodeTriage.partition(scan.episodes, (episode) =>
      suppressions.suppressionReasonFor(episode)
    );

    return { type: 'continue', data: { triage } };
  }
}
