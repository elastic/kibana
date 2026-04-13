/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PipelineStep {
  action?: string;
  [key: string]: unknown;
}

export interface SubmittedPipeline {
  steps?: PipelineStep[];
  [key: string]: unknown;
}

export interface ZodIssueWithPath {
  message: string;
  path: PropertyKey[];
}

/**
 * Filters Zod validation errors to return only those relevant to the processors
 * actually present in the submitted pipeline. This avoids confusing the model
 * with union discriminator errors for processor types it didn't intend to use.
 *
 * @param issues - Array of Zod validation issues from safeParse
 * @param submittedPipeline - The raw pipeline object submitted by the model
 * @returns Filtered array of issues relevant to the submitted pipeline
 */
export function formatZodPipelineErrors(
  issues: ZodIssueWithPath[],
  submittedPipeline: SubmittedPipeline
): ZodIssueWithPath[] {
  const steps = submittedPipeline.steps ?? [];
  const actionsInPipeline = new Set(steps.map((step) => step.action).filter(Boolean));

  return issues.filter((issue) => {
    // Check if this is a union discriminator error for a processor type not in the pipeline
    const path = issue.path;
    // Union errors typically have a path like ['steps', <index>, 'action'] or similar
    if (path.length >= 3 && path[0] === 'steps' && path[2] === 'action') {
      const stepIndex = path[1];
      if (typeof stepIndex === 'number') {
        const step = steps[stepIndex];
        if (step && step.action) {
          // Keep the error if it's about the action actually used in this step
          const errorMessage = issue.message.toLowerCase();
          const stepAction = step.action.toLowerCase();
          // If the error message mentions the actual action used, keep it
          if (errorMessage.includes(stepAction)) {
            return true;
          }
          // If the error is about an action NOT in the pipeline, filter it out
          return false;
        }
      }
    }

    // For errors in step-specific fields (not the action discriminator),
    // check if the step at that index has an action that's in the pipeline
    if (path.length >= 2 && path[0] === 'steps') {
      const stepIndex = path[1];
      if (typeof stepIndex === 'number') {
        const step = steps[stepIndex];
        // If we can't determine the action, keep the error to be safe
        if (!step || !step.action) {
          return true;
        }
        // Keep errors for steps with actions that are in the pipeline
        if (actionsInPipeline.has(step.action)) {
          return true;
        }
        // Filter out errors for steps with actions not in the pipeline
        return false;
      }
    }

    // Keep all other errors (non-step-related)
    return true;
  });
}
