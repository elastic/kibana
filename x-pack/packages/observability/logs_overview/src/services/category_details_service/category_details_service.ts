/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MachineImplementationsFrom, assign, setup } from 'xstate5';
import { LogCategory } from '../../types';
import { CategoryDetailsServiceDependencies, LogCategoryDetailsParams } from './types';

export const categoryDetailsService = setup({
  types: {
    input: {} as LogCategoryDetailsParams,
    output: {} as {},
    context: {} as {
      parameters: LogCategoryDetailsParams;
      expandedRowIndex: number | null;
      expandedCategory: LogCategory | null;
    },
    events: {} as {
      type: 'setExpandedCategory';
      rowIndex: number | null;
      category: LogCategory | null;
    },
  },
  actors: {},
  actions: {
    storeCategory: assign(
      ({ context, event }, params: { category: LogCategory | null; rowIndex: number | null }) => ({
        expandedCategory: params.category,
        expandedRowIndex: params.rowIndex,
      })
    ),
  },
  guards: {
    hasCategory: (_guardArgs, params: { expandedCategory: LogCategory | null }) =>
      params.expandedCategory !== null,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAXMUD2AnAlgF5gAy2UsAdMtgK4B26+9UAItsrQLZiOwDEEbPTCVmAN2wBrUWkw4CxMhWp1GzNh2690sBBI4Z8wgNoAGALrmLiUAAdssfE2G2QAD0QBmMwA5KACy+AQFmob4AjABMwQBsADQgAJ6IkYEAnJkA7FmxZlERmQGxAL4liXJYeESk5FQ0DEws7Jw8fILCogYy1BhVirUqDerNWm26+vSScsb01iYRNkggDk4u9G6eCD7+QSFhftFxiSkIvgCsWZSxEVlRsbFZ52Zm515lFX0KNcr1ak2aVo6ARCERiKbSWRfapKOqqRoaFraPiTaZGUyWExRJb2RzOWabbx+QLBULhI7FE7eWL+F45GnRPIRZkfECVb6wob-RFjYH8MC4XB4Sh2AA2GAAZnguL15DDBn8EaMgSiDDMMVZLG5VvjXMstjsSftyTFKclEOdzgFKF5zukvA8zBFnl50udWez5b94SNAcjdPw0PRkGBRdZtXj1oTtsS9mTDqaEuaEBF8udKFkIr5fK6olkzOksgEPdCBt6JWB0MgABYaADKqC4YsgAGFS-g4B0wd0oXKBg2m6LW+24OHljqo-rEMzbpQos8-K7fC9CknTrF0rEbbb0oVMoWIgF3eU2e3OVQK1XaywB82IG2+x2BAKhbgReL0FLcDLPf3G3eH36J8x1xNYCSnFNmSuecXhzdJlydTcqQQLJfHSOc0PyLJN3SMxYiPEtH3PShLxret-yHe8RwEIMQzDLVx0jcDQC2GdoIXOCENXZDsyiOcAiiKJ0iiPDLi8V1CKA4jSOvKAACUwC4VBmA0QDvk7UEughHpfxqBSlJUlg1OqUcGNA3UNggrMs347IjzdaIvGQwSvECXI8k3Z43gEiJJI5BUSMrMiWH05T6FU6j+UFYUxUlaVZSksBQsMqBjIIUycRWJi9RY6dIn8KIAjsu1zkc5CAmiG1fBiaIzB8B0QmPT4iICmSNGS8KjMi2jQxArKwJyjw8pswriocqInOTLwIi3ASD1yQpswCd5WXobAIDgNxdPPCMBss3KEAAWjXRBDvTfcLsu9Jlr8r04WGAEkXGeBGL26MBOQzIt2ut4cwmirCt8W6yzhNqbwo4dH0216LOjTMIjnBdYhK1DYgdHjihtZbUIdWIXJuYGflBoLZI6iKoZe8zJwOw9KtGt1kbuTcsmQrwi0oeCQjzZ5blwt1Cek5TKN22GIIKZbAgKC45pyLyeLwtz4Kyabs1QgWAs0kXqaGhBxdcnzpaE2XXmch0MORmaBJeLwjbKMogA */
  id: 'logCategoryDetails',
  context: ({ input }) => ({
    expandedCategory: null,
    expandedRowIndex: null,
    parameters: input,
  }),
  initial: 'idle',
  states: {
    idle: {
      on: {
        setExpandedCategory: {
          actions: [
            {
              type: 'storeCategory',
              params: ({ event }) => event,
            },
          ],
        },
      },
    },
  },
  output: ({ context }) => ({}),
});

export const createCategoryDetailsServiceImplementations = ({
  search,
}: CategoryDetailsServiceDependencies): MachineImplementationsFrom<
  typeof categoryDetailsService
> => ({});
