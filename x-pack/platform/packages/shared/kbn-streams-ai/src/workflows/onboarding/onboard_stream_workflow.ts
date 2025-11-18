/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type {
  OnboardStreamWorkflowApplyResult,
  OnboardStreamWorkflowGenerateResult,
  OnboardStreamWorkflowInput,
} from './types';
import type { StreamWorkflow } from '../types';
import { generateDescriptionWorkflow } from './description/generate_description_workflow';
import { onboardAnomalyDetectionJobsWorkflow } from './anomaly_detection/onboard_anomaly_detection_workflow';
import { onboardDashboardsWorkflow } from './dashboards/onboard_dashboards_workflow';
import { generateNaturalLanguageQueriesWorkflow } from './queries/generate_nl_queries_workflow';
import { onboardProcessingWorkflow } from './processing/onboard_processing_workflow';
import { onboardRulesWorkflow } from './rules/onboard_rules_workflow';
import { onboardSLOsWorkflow } from './slos/onboard_slos_workflow';

export const onboardStreamWorkflow: StreamWorkflow<
  Streams.all.Model,
  OnboardStreamWorkflowInput,
  OnboardStreamWorkflowGenerateResult,
  OnboardStreamWorkflowApplyResult
> = {
  async generate(context, input) {
    let updatedInput = input;

    const descriptionResult = !input.stream.definition.description
      ? await generateDescriptionWorkflow.generate(context, input)
      : undefined;

    updatedInput = descriptionResult
      ? {
          ...input,
          stream: {
            ...input.stream,
            definition: {
              ...input.stream.definition,
              description: descriptionResult.change.description,
            },
          },
        }
      : input;

    const processingResult =
      'ingest' in updatedInput.stream.definition
        ? await onboardProcessingWorkflow.generate(context, updatedInput)
        : undefined;

    const nlQueriesResult = await generateNaturalLanguageQueriesWorkflow.generate(context, {
      ...updatedInput,
      analysis: processingResult ? processingResult.analysis : input.analysis,
    });

    const queries = nlQueriesResult.change.queries;

    const [anomalyDetectionResult, dashboardResult, ruleResult, sloResult] = await Promise.all([
      onboardAnomalyDetectionJobsWorkflow.generate(context, {
        ...updatedInput,
        queries,
      }),
      onboardDashboardsWorkflow.generate(context, {
        ...updatedInput,
        queries,
      }),
      onboardRulesWorkflow.generate(context, {
        ...updatedInput,
        queries,
      }),
      onboardSLOsWorkflow.generate(context, {
        ...updatedInput,
        queries,
      }),
    ]);

    return {
      change: {
        description: descriptionResult?.change.description,
        processing: processingResult?.change.processors,
        anomaly_detection: anomalyDetectionResult.change.jobs,
        dashboards: dashboardResult.change.dashboards,
        rules: ruleResult.change.rules,
        slos: sloResult.change.slos,
      },
    };
  },
  async apply(context, input, change) {
    return {
      status: 'success',
      stream: input.stream,
    };
  },
};
