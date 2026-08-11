/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPlaceholderFor } from '@kbn/xstate-utils';
import { createActorContext } from '@xstate/react';
import type { MachineImplementationsFrom } from 'xstate';
import { assign, setup } from 'xstate';
import type { LogCategory } from '../../types';
import { categorizeDocuments } from './categorize_documents';
import { countDocuments } from './count_documents';
import type { CategorizeLogsServiceDependencies, LogCategorizationParams } from './types';

export const categorizeLogsService = setup({
  types: {
    input: {} as LogCategorizationParams,
    output: {} as {
      categories: LogCategory[];
      documentCount: number;
      hasReachedLimit: boolean;
      samplingProbability: number;
    },
    context: {} as {
      categories: LogCategory[];
      documentCount: number;
      error?: Error;
      hasReachedLimit: boolean;
      parameters: LogCategorizationParams;
      samplingProbability: number;
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
    storeCategories: assign(
      ({ context }, params: { categories: LogCategory[]; hasReachedLimit: boolean }) => ({
        categories: [...context.categories, ...params.categories],
        hasReachedLimit: params.hasReachedLimit,
      })
    ),
    storeDocumentCount: assign(
      (_, params: { documentCount: number; samplingProbability: number }) => ({
        documentCount: params.documentCount,
        samplingProbability: params.samplingProbability,
      })
    ),
  },
  guards: {
    hasTooFewDocuments: (_guardArgs, params: { documentCount: number }) => params.documentCount < 1,
    requiresSampling: (_guardArgs, params: { samplingProbability: number }) =>
      params.samplingProbability < 1,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAXMUD2AnAlgF5gAy2UsAdMtgK4B26+9UAItsrQLZiOwDEEbPTCVmAN2wBrUWkw4CxMhWp1GzNh2690sBBI4Z8wgNoAGALrmLiUAAdssfE2G2QAD0QBmMwA5KACy+AQFmob4AjABMwQBsADQgAJ6IkYEAnJkA7FmxZlERmQGxAL4liXJYeESk5FQ0DEws7Jw8fILCogYy1BhVirUqDerNWm26+vSScsb01iYRNkggDk4u9G6eCD7+QSFhftFxiSkIvgCsWZSxEVlRsbFZ52Zm515lFX0KNcr1ak2aVo6ARCERiKbSWRfapKOqqRoaFraPiTaZGUyWExRJb2RzOWabbx+QLBULhI7FE7eWL+F45GnRPIRZkfECVb6wob-RFjYH8MC4XB4Sh2AA2GAAZnguL15DDBn8EaMgSiDDMMVZLG5VvjXMstjsSftyTFKclEOdzgFKF5zukvA8zBFnl50udWez5b94SNAcjdPw0PRkGBRdZtXj1oTtsS9mTDqaEuaEBF8udKFkIr5fK6olkzOksgEPdCBt6JWB0MgABYaADKqC4YsgAGFS-g4B0wd0oXKBg2m6LW+24OHljqo-rEMzbpQos8-K7fC9CknTrF0rEbbb0oVMoWIgF3eU2e3OVQK1XaywB82IG2+x2BAKhbgReL0FLcDLPf3G3eH36J8x1xNYCSnFNmSuecXhzdJlydTcqQQLJfHSOc0PyLJN3SMxYiPEtH3PShLxret-yHe8RwEIMQzDLVx0jcDQC2GdoIXOCENXZDsyiOcAiiKJ0iiPDLi8V1CKA4jSOvKAACUwC4VBmA0QDvk7UEughHpfxqBSlJUlg1OqUcGNA3UNggrMs347IjzdaIvGQwSvECXI8k3Z43gEiJJI5BUSMrMiWH05T6FU6j+UFYUxUlaVZSksBQsMqBjIIUycRWJi9RY6dIn8KIAjsu1zkc5CAmiG1fBiaIzB8B0QmPT4iICmSNGS8KjMi2jQxArKwJyjw8pswriocqInOTLwIi3ASD1yQpswCd5WXobAIDgNxdPPCMBss3KEAAWjXRBDvTfcLsu9Jlr8r04WGAEkXGeBGL26MBOQzIt2ut4cwmirCt8W6yzhNqbwo4dH0216LOjTMIjnBdYhK1DYgdHjihtZbUIdWIXJuYGflBoLZI6iKoZe8zJwOw9KtGt1kbuTcsmQrwi0oeCQjzZ5blwt1Cek5TKN22GIIKZbAgKC45pyLyeLwtz4Kyabs1QgWAs0kXqaGhBxdcnzpaE2XXmch0MORmaBJeLwjbKMogA */
  id: 'categorizeLogs',
  context: ({ input }) => ({
    categories: [],
    documentCount: 0,
    hasReachedLimit: false,
    parameters: input,
    samplingProbability: 1,
  }),
  initial: 'countingDocuments',
  states: {
    countingDocuments: {
      invoke: {
        src: 'countDocuments',
        input: ({ context }) => context.parameters,
        onDone: [
          {
            target: 'done',
            guard: {
              type: 'hasTooFewDocuments',
              params: ({ event }) => event.output,
            },
            actions: [
              {
                type: 'storeDocumentCount',
                params: ({ event }) => event.output,
              },
            ],
          },
          {
            target: 'fetchingSampledCategories',
            guard: {
              type: 'requiresSampling',
              params: ({ event }) => event.output,
            },
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
          samplingProbability: 1,
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
    hasReachedLimit: context.hasReachedLimit,
    samplingProbability: context.samplingProbability,
  }),
});

export const CategorizeLogsServiceContext = createActorContext(categorizeLogsService);

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
