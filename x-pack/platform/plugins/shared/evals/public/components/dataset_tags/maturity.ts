/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps } from '@elastic/eui';
import type { DatasetMaturity } from '@kbn/evals-common';
import * as i18n from './translations';

const maturityDisplay: Record<DatasetMaturity, { label: string; color: EuiBadgeProps['color'] }> = {
  raw: { label: i18n.MATURITY_RAW, color: 'hollow' },
  cleaned: { label: i18n.MATURITY_CLEANED, color: 'primary' },
  golden: { label: i18n.MATURITY_GOLDEN, color: 'success' },
};

export const MATURITY_LEVELS = Object.keys(maturityDisplay) as DatasetMaturity[];

export const getMaturityLabel = (maturity: DatasetMaturity): string =>
  maturityDisplay[maturity].label;

export const getMaturityColor = (maturity: DatasetMaturity): EuiBadgeProps['color'] =>
  maturityDisplay[maturity].color;
