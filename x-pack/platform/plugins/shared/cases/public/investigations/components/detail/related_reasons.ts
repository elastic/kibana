/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelatedRecord } from '../../../../common/investigations/types';
import * as i18n from './translations';

const MAX_REASONS_IN_CARD = 2;

const REASON_FORMATTERS: Record<
  RelatedRecord['reasons'][number]['type'],
  (value: string) => string
> = {
  entity: i18n.REASON_ENTITY,
  indicator: i18n.REASON_INDICATOR,
  alert: i18n.REASON_ALERT,
  merged: i18n.REASON_MERGED,
};

/** One readable sentence fragment per reason the server found. */
export const getReasonLabels = ({ reasons }: RelatedRecord): string[] => {
  if (reasons.length === 0) {
    return [i18n.REASON_NONE];
  }
  return reasons.map(({ type, value }) => REASON_FORMATTERS[type](value));
};

/** The "Why similar" text of the card: the first reasons and how many more there are. */
export const getReasonSummary = (related: RelatedRecord): string => {
  const labels = getReasonLabels(related);
  const shown = labels.slice(0, MAX_REASONS_IN_CARD).join(', ');
  const hidden = labels.length - MAX_REASONS_IN_CARD;
  return hidden > 0 ? `${shown}, ${i18n.REASONS_MORE(hidden)}` : shown;
};
