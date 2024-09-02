/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MachineImplementationsFrom, assign, setup } from 'xstate5';
import { getPlaceholderFor } from '../../../utils/xstate5_utils';
import { categorizeDocuments } from './categorize_documents';
import { countDocuments } from './count_documents';
import { CategorizeLogsServiceDependencies, LogsCategorizationParams } from './types';
import { LogCategory } from '../../types';

export const categorizeLogsService = setup({
  types: {
    input: {} as LogsCategorizationParams,
    output: {} as {
      categories: LogCategory[];
      documentCount: number;
      samplingProbability: number;
    },
    context: {} as {
      categories: LogCategory[];
      documentCount: number;
      parameters: LogsCategorizationParams;
      samplingProbability: number;
      error?: Error;
    },
  },
  actors: {
    countDocuments: getPlaceholderFor(countDocuments),
    categorizeDocuments: getPlaceholderFor(categorizeDocuments),
  },
  actions: {
    storeError: assign((_, params: { error: Error }) => ({
      error: params.error,
    })),
    storeCategories: assign(({ context }, params: { categories: LogCategory[] }) => ({
      categories: [...context.categories, ...params.categories],
    })),
    storeDocumentCount: assign(
      (_, params: { documentCount: number; samplingProbability: number }) => ({
        documentCount: params.documentCount,
        samplingProbability: params.samplingProbability,
      })
    ),
  },
  guards: {
    requiresSampling: ({ context }) => context.samplingProbability < 1,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAXMUD2AnAlgF5gAy2UsAdMtgK4B26+9UAItsrQLZiOwDEEbPTCVmAN2wBrUWkw4CxMhWp1GzNh2690sBBI4Z8wgNoAGALrmLiUAAdssfE2G2QAD0QAmABw-KACw+AQDMAOwAbGEAnGFmPgA0IACe3gFmlD7RIV4AjPlm6SFmXtEAvmVJclh4RKTkVDQMTCzsnDx8gsKiBjLUGDWK9SpN6q1aHbr69JJyxvTWJrk2SCAOTi70bp4Ivv5BoZExcYkpiD65lACsZrchUV5mEeFmIRVVAwp1yo1qLZrtHQCMC4XB4Sh2AA2GAAZnguP15LUlA1VM0NG1tHxprMjKZLNY3OtnPNtt4-IFguEorF4klUghQldKDSwmF7hEsmEvFc3pUQNUviiVDCwOhkAALDQAZVQXChkAAwp9anAuiIxDNpLIVUNZfLIUrdfg4ITVsTNmSELkzFdmWZsmzObkrukAld6d4vCFApEIrkwj5OT57gH3gLjcKqKLxVKWPqFRBlUiCGqQWDcBDoeg4bgEYLkWAE4ak8bTZYiY4Sa5VjsbXbKA7wpELq7Ch6zggQrkIoFShFSiVCo8IuGC0MfpQY5KNAAlMBcVDMDTJwYmgRCDW9HUpurzxfLlirr7llb2KuW2uIAMBXtNiLPHxXYIXLyehA+LyUEI-l62kK0vcY6RsM0ZijOLD7ku9ArmWwKguCUKwvCiJrsQUGHlAx6qrAZrnhspJXtaYS3o22QPiET4vrkb6dgGzK+BEvLejc9xBhU-L0NgEBwG447fA0lYETWoA7AAtBE74ScBu5RmiYwAliuhCdWWxEQEtEMjalzaREGncl4jwOj4MloaBU7gXGUDFkau68eaF6EaJiBMdEZHNmY7LekE76GW5-qxFRpQaQOfIfLJ5nTlZGEwUecEqZeznWiENzueyP4BIG3YBO+FKZQ+uQpUG0RRClplCpFS4lglTkeN4tqXF4TFXC6eQxNEtq+R1LIxAOHWZSVkTlYWk6bmANUiXVuwNZQTV2q1AbRB1HZaSUmQOtEvKUb40TpLkHFlEAA */
  id: 'categorizeLogs',
  context: ({ input }) => ({
    categories: [],
    documentCount: 0,
    parameters: input,
    samplingProbability: 0,
  }),
  initial: 'countingDocuments',
  states: {
    countingDocuments: {
      invoke: {
        src: 'countDocuments',
        input: ({ context }) => context.parameters,
        onDone: [
          {
            target: 'fetchingSampledCategories',
            guard: 'requiresSampling',
            actions: [
              {
                type: 'storeDocumentCount',
                params: ({ event }) => event.output,
              },
            ],
          },
          {
            target: 'fetchingRemainingCategories',
            actions: [
              {
                type: 'storeDocumentCount',
                params: ({ event }) => event.output,
              },
            ],
          },
        ],
        onError: {
          target: 'failed',
          actions: [],
        },
      },
    },

    fetchingSampledCategories: {
      invoke: {
        src: 'categorizeDocuments',
        id: 'categorizeSampledCategories',
        input: ({ context }) => ({
          ...context.parameters,
          samplingProbability: context.samplingProbability,
          ignoredQueries: [],
          minDocsPerCategory: 10,
        }),
        onDone: {
          target: 'fetchingRemainingCategories',
          actions: [
            {
              type: 'storeCategories',
              params: ({ event }) => event.output,
            },
          ],
        },
        onError: 'failed',
      },
    },

    fetchingRemainingCategories: {
      invoke: {
        src: 'categorizeDocuments',
        id: 'categorizeRemainingCategories',
        input: ({ context }) => ({
          ...context.parameters,
          samplingProbability: context.samplingProbability,
          ignoredQueries: context.categories.map((category) => category.terms),
          minDocsPerCategory: 0,
        }),
        onDone: {
          target: 'done',
          actions: [
            {
              type: 'storeCategories',
              params: ({ event }) => event.output,
            },
          ],
        },
        onError: 'failed',
      },
    },

    failed: {
      type: 'final',
    },

    done: {
      type: 'final',
    },
  },
  output: ({ context }) => ({
    categories: context.categories,
    documentCount: context.documentCount,
    samplingProbability: context.samplingProbability,
  }),
});

export const createCategorizeLogsServiceImplementations = ({
  search,
}: CategorizeLogsServiceDependencies): MachineImplementationsFrom<
  typeof categorizeLogsService
> => ({
  actors: {
    categorizeDocuments: categorizeDocuments({ search }),
    countDocuments: countDocuments({ search }),
  },
});
