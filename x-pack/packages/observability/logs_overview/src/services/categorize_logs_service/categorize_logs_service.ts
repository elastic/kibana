/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MachineImplementationsFrom, assign, setup } from 'xstate5';
import { getPlaceholderFor } from '../../utils/xstate5_utils';
import { categorizeDocuments } from './categorize_documents';
import { countDocuments } from './count_documents';
import { CategorizeLogsServiceDependencies, LogCategorizationParams } from './types';
import { LogCategory } from '../../types';

export const categorizeLogsService = setup({
  types: {
    input: {} as LogCategorizationParams,
    output: {} as {
      categories: LogCategory[];
      documentCount: number;
      samplingProbability: number;
    },
    context: {} as {
      categories: LogCategory[];
      documentCount: number;
      parameters: LogCategorizationParams;
      samplingProbability: number;
      error?: Error;
    },
    events: {} as {
      type: 'cancel';
    },
  },
  actors: {
    countDocuments: getPlaceholderFor(countDocuments),
    categorizeDocuments: getPlaceholderFor(categorizeDocuments),
  },
  actions: {
    storeError: assign((_, params: { error: unknown }) => ({
      error: params.error instanceof Error ? params.error : new Error(String(params.error)),
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
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAXMUD2AnAlgF5gAy2UsAdMtgK4B26+9UAItsrQLZiOwDEEbPTCVmAN2wBrUWkw4CxMhWp1GzNh2690sBBI4Z8wgNoAGALrmLiUAAdssfE2G2QAD0QAmAJwAOSgAWP0CAZgA2M0CzAEZwgFYYgHYkgBoQAE9EJK8vIPCYsy8k+K94pJ8YmIBfavS5LDwiUnIqGgYmFnZOHj5BYVEDGWoMRsUWlXb1Lq1e3X16STljemsTGJskEAcnF3o3TwRfAOCwyOi4xJT0rKPQmMpQxPifJNCkyLK-cNr60YVmso2mpOpoejoBGBcLg8JQ7AAbDAAMzwXBG8iaSlaqg6Gm62j4CyWRlMlmsbh2zhWB28-iCIQiUViCWSaUyiD8D3iZh5MS8kSiXhilV+IAaAKxkxBeNmEP4aHoyDA8PJW0pexpRzpp0ZFxZ13ZCHipUofhewQqKXCXkCovFmImVCRYHQyAAFhoAMqoLgIyAAYX+TTg-REYkW0lkQfG3t98ID0fwcFV9kcVNcW0OhRKlDMPneZktPjKBtu4R84UejNCXh5SUCQqSdsTkqdLvdXp9foggYxBBDUJhuDhiPQKNwaPtMa78Z7ieTlgpaY1mcQ2fiufzSULr2L5TZtySfh8lC8x9rgXigXCoT8T2bfcB2Odro9LFj3d7YyTAgVSpVi5qsu1Krgg66bgWRYlgeHJ+HkNpeO825mqEl5eA+36tpQL4diwABKYBcKgzAaF+AIhkIYZDFGj7EARREkSwZHBrAKbbMBGagFmVoQeECShO8No1jc3iIUEHwvH43w+D4RT1hhEqOth7ZvlA9HEfQpHzpC0KwgiyKouimFgOpjFQMx-asYBqa7CBXFrjxeYRPxglhF4IkIIEfKPHBZo+NeISRDUdRii2Sk4appmaUx2nyqgirKmx6p2R4DkfLxLk5G5Hn3JWDavEkMTRFJ4SBGVtQhfQ2AQHAbhTk+FBLrZnGpQgAC04QeW1G4yb1fX9aECkOkCOLTGCBK6E16b7KBDYeYUG7vAkZplXmHzFEN4wjRFnZxgmj61UBzUzfZCB8SeTk5DEJXHJ1hqFQ813rcU8QoQJm0NW2r4aFFWkHfAR3TZqMQFhBJQNreDY2h5iEBDWnLHtahRFRtIX1VhSLEbOU0rqdQqxKeCTXgkiR+EUHlnJQRWJNEr104W8QfVhlFgDjKWHPjDz8lefHGtd5OGkJlA+PENbvJekR3vcFXVEAA */
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
          actions: [
            {
              type: 'storeError',
              params: ({ event }) => ({ error: event.error }),
            },
          ],
        },
      },

      on: {
        cancel: {
          target: 'failed',
          actions: [
            {
              type: 'storeError',
              params: () => ({ error: new Error('Counting cancelled') }),
            },
          ],
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
          ignoredCategoryTerms: [],
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
        onError: {
          target: 'failed',
          actions: [
            {
              type: 'storeError',
              params: ({ event }) => ({ error: event.error }),
            },
          ],
        },
      },

      on: {
        cancel: {
          target: 'failed',
          actions: [
            {
              type: 'storeError',
              params: () => ({ error: new Error('Categorization cancelled') }),
            },
          ],
        },
      },
    },

    fetchingRemainingCategories: {
      invoke: {
        src: 'categorizeDocuments',
        id: 'categorizeRemainingCategories',
        input: ({ context }) => ({
          ...context.parameters,
          samplingProbability: context.samplingProbability,
          ignoredCategoryTerms: context.categories.map((category) => category.terms),
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
        onError: {
          target: 'failed',
          actions: [
            {
              type: 'storeError',
              params: ({ event }) => ({ error: event.error }),
            },
          ],
        },
      },

      on: {
        cancel: {
          target: 'failed',
          actions: [
            {
              type: 'storeError',
              params: () => ({ error: new Error('Categorization cancelled') }),
            },
          ],
        },
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
