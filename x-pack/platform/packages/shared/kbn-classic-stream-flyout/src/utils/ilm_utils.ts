/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PolicyFromES, Phases } from '@kbn/index-lifecycle-management-common-shared';
import type { SimulateIndexTemplateResponse } from '@kbn/index-management-shared-types';

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
export type IlmPolicyFetcher = (
  policyName: string,
  signal?: AbortSignal
) => Promise<PolicyFromES | null>;

/**
 * Async function to fetch simulated template data by template name.
 */
export type SimulatedTemplateFetcher = (
  templateName: string,
  signal?: AbortSignal
) => Promise<SimulateIndexTemplateResponse | null>;

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
          'Frozen {previousStartAge, select, undefined {indefinitely} other {until {previousStartAge}}}',
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
          'Cold {previousStartAge, select, undefined {indefinitely} other {until {previousStartAge}}}',
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
          'Warm {previousStartAge, select, undefined {indefinitely} other {until {previousStartAge}}}',
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
          'Hot {previousStartAge, select, undefined {indefinitely} other {until {previousStartAge}}}',
        values: { previousStartAge },
      }),
      color: phaseColors.hot,
    });
  }

  return descriptions.reverse();
};
