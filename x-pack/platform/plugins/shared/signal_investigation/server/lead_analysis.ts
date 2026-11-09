/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { isResponseError } from '@kbn/es-errors';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type {
  SignalAnalyzer,
  SignalAnalyzerDeps,
  SignalAnalyzerResult,
} from '@kbn/signal-investigation-contract';

export interface SignalInvestigationLicense {
  isActive: boolean;
  hasAtLeast: (minimum: 'platinum') => boolean;
}

export type LeadAnalysisOutcome =
  | { kind: 'forbidden'; message: string }
  | { kind: 'closed' }
  | { kind: 'ok'; body: SignalAnalyzerResult };

const licenseRequiredMessage = (): string =>
  i18n.translate('xpack.signalInvestigation.route.licenseRequired', {
    defaultMessage: 'Find related changes requires an active Platinum license.',
  });

const hasActivePlatinumLicense = (license: SignalInvestigationLicense): boolean =>
  license.isActive && license.hasAtLeast('platinum');

/** Runs one analyzer and maps license, access, and abort failures to route outcomes. */
export const runLeadAnalysis = async ({
  analyzer,
  seed,
  deps,
  abortSignal,
  license,
}: {
  analyzer: SignalAnalyzer;
  seed: InvestigationSeed;
  deps: SignalAnalyzerDeps;
  abortSignal: AbortSignal;
  license: SignalInvestigationLicense;
}): Promise<LeadAnalysisOutcome> => {
  if (!hasActivePlatinumLicense(license)) {
    return { kind: 'forbidden', message: licenseRequiredMessage() };
  }
  if (abortSignal.aborted) {
    return { kind: 'closed' };
  }

  try {
    const applicability = analyzer.getApplicability(seed, {});
    const result = applicability.applicable
      ? await analyzer.run(seed, deps, abortSignal)
      : {
          leads: [],
          entities: {},
          status: applicability.status ?? ('not_applicable' as const),
          message: applicability.message,
        };
    return { kind: 'ok', body: result };
  } catch (error) {
    if (abortSignal.aborted || error instanceof errors.RequestAbortedError) {
      return { kind: 'closed' };
    }
    if (
      (isResponseError(error) && error.statusCode === 403) ||
      (error instanceof Error && SavedObjectsErrorHelpers.isForbiddenError(error))
    ) {
      return {
        kind: 'ok',
        body: { leads: [], entities: {}, status: 'no_access' },
      };
    }
    throw error;
  }
};
