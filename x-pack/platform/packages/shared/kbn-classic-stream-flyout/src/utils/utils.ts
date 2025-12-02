/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import type { PolicyFromES, Phases } from '@kbn/index-lifecycle-management-common-shared';

/**
 * Phase description for UI display
 */
export interface PhaseDescription {
  description: string;
  color: string;
}

/**
 * ILM policy data for UI display
 */
export interface IlmPolicyDetails {
  name: string;
  phases: PhaseDescription[];
}

/**
 * Async function to fetch ILM policy by name
 */
export type IlmPolicyFetcher = (policyName: string) => Promise<PolicyFromES | null>;

/**
 * Phase indicator colors for ILM phases
 */
export interface PhaseColors {
  hot: string;
  warm: string;
  cold: string;
  frozen: string;
}

/**
 * Generates phase descriptions from an ILM policy's phases
 */
export const getPhaseDescriptions = (
  phases: Phases,
  phaseColors: PhaseColors
): PhaseDescription[] => {
  const descriptions: PhaseDescription[] = [];
  let previousStartAge: string | undefined;

  if (phases.delete) {
    previousStartAge = phases.delete.min_age;
  }

  if (phases.frozen) {
    descriptions.push({
      description: i18n.translate('xpack.createClassicStreamFlyout.phases.frozen', {
        defaultMessage:
          'Frozen {previousStartAge, select, undefined {indefinitely} other {till {previousStartAge}}}',
        values: { previousStartAge },
      }),
      color: phaseColors.frozen,
    });
    previousStartAge = phases.frozen.min_age ?? previousStartAge;
  }

  if (phases.cold) {
    descriptions.push({
      description: i18n.translate('xpack.createClassicStreamFlyout.phases.cold', {
        defaultMessage:
          'Cold {previousStartAge, select, undefined {indefinitely} other {till {previousStartAge}}}',
        values: { previousStartAge },
      }),
      color: phaseColors.cold,
    });
    previousStartAge = phases.cold.min_age ?? previousStartAge;
  }

  if (phases.warm) {
    descriptions.push({
      description: i18n.translate('xpack.createClassicStreamFlyout.phases.warm', {
        defaultMessage:
          'Warm {previousStartAge, select, undefined {indefinitely} other {till {previousStartAge}}}',
        values: { previousStartAge },
      }),
      color: phaseColors.warm,
    });
    previousStartAge = phases.warm.min_age ?? previousStartAge;
  }

  if (phases.hot) {
    descriptions.push({
      description: i18n.translate('xpack.createClassicStreamFlyout.phases.hot', {
        defaultMessage:
          'Hot {previousStartAge, select, undefined {indefinitely} other {till {previousStartAge}}}',
        values: { previousStartAge },
      }),
      color: phaseColors.hot,
    });
  }

  return descriptions.reverse();
};

export const formatDataRetention = (template: TemplateDeserialized): string | undefined => {
  const { lifecycle } = template;

  if (!lifecycle?.enabled) {
    return undefined;
  }

  if (lifecycle.infiniteDataRetention) {
    return '∞';
  }

  if (lifecycle.value && lifecycle.unit) {
    return `${lifecycle.value}${lifecycle.unit}`;
  }

  return undefined;
};

/**
 * Checks if a stream name has unfilled wildcards (contains *)
 */
export const hasEmptyWildcards = (streamName: string): boolean => {
  return streamName.includes('*');
};

/**
 * Result from stream name validation
 */
export interface StreamNameValidationResult {
  /** The type of error, or null if valid */
  errorType: 'empty' | 'duplicate' | 'higherPriority' | null;
  /** For higherPriority errors, the conflicting index pattern */
  conflictingIndexPattern?: string;
}

/**
 * Async validator function type for external validation (duplicate/priority checks)
 */
export type StreamNameValidator = (streamName: string) => Promise<{
  errorType: 'duplicate' | 'higherPriority' | null;
  conflictingIndexPattern?: string;
}>;

/**
 * Validates a stream name by checking for empty wildcards and running async validation.
 * Returns the validation result with error type and optional conflicting pattern.
 */
export const validateStreamName = async (
  streamName: string,
  onValidate?: StreamNameValidator
): Promise<StreamNameValidationResult> => {
  // First, check for empty wildcards (local validation)
  if (hasEmptyWildcards(streamName)) {
    return { errorType: 'empty' };
  }

  // Run the external validator if provided
  if (onValidate) {
    const result = await onValidate(streamName);

    if (result.errorType === 'duplicate') {
      return { errorType: 'duplicate' };
    } else if (result.errorType === 'higherPriority') {
      return {
        errorType: 'higherPriority',
        conflictingIndexPattern: result.conflictingIndexPattern,
      };
    }
  }

  // All validations passed
  return { errorType: null };
};
