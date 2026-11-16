/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';

const boostFormat = new Intl.NumberFormat(i18n.getLocale(), { maximumFractionDigits: 2 });

export const formatBoost = (boost: number): string => boostFormat.format(boost);

export const formatStorageSize = (bytes: number): string => numeral(bytes).format('0.[0] b');
