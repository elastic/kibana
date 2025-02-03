/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_DURATION_INPUT_FORMAT,
  DEFAULT_DURATION_OUTPUT_FORMAT,
} from '@kbn/field-formats-plugin/common';
import type { FormatColumnArgs } from '.';

export const supportedFormats: Record<
  string,
  {
    formatId: string;
    decimalsToPattern: (decimals?: number, compact?: boolean) => string;
    translateToFormatParams?: (
      params: Omit<FormatColumnArgs, 'format' | 'columnId' | 'parentFormat'>
    ) => Record<string, unknown>;
  }
> = {
  number: {
    formatId: 'number',
    decimalsToPattern: (decimals = 2, compact?: boolean) => {
      if (decimals === 0) {
        return `0,0${compact ? 'a' : ''}`;
      }
      return `0,0.${'0'.repeat(decimals)}${compact ? 'a' : ''}`;
    },
  },
  percent: {
    formatId: 'percent',
    decimalsToPattern: (decimals = 2, compact?: boolean) => {
      if (decimals === 0) {
        return `0,0${compact ? 'a' : ''}%`;
      }
      return `0,0.${'0'.repeat(decimals)}${compact ? 'a' : ''}%`;
    },
  },
  bytes: {
    formatId: 'bytes',
    decimalsToPattern: (decimals = 2, compact?: boolean) => {
      if (decimals === 0) {
        return `0,0b`;
      }
      return `0,0.${'0'.repeat(decimals)}b`;
    },
  },
  bits: {
    formatId: 'bytes',
    decimalsToPattern: (decimals = 2, compact?: boolean) => {
      if (decimals === 0) {
        return `0,0bitd`;
      }
      return `0,0.${'0'.repeat(decimals)}bitd`;
    },
  },
  duration: {
    formatId: 'duration',
    decimalsToPattern: () => '',
    translateToFormatParams: (params) => {
      return {
        inputFormat: params.fromUnit || DEFAULT_DURATION_INPUT_FORMAT.kind,
        outputFormat: params.toUnit || DEFAULT_DURATION_OUTPUT_FORMAT.method,
        outputPrecision: params.decimals,
        useShortSuffix: Boolean(params.compact),
        showSuffix: true,
        includeSpaceWithSuffix: true,
      };
    },
  },
  custom: {
    formatId: 'custom',
    decimalsToPattern: () => '',
  },
};
