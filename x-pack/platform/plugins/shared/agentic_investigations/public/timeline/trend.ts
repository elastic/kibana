/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Whether a trend is something we want to go down (bad), up (good), or neither. */
export type TrendTone = 'bad' | 'good' | 'neutral';

const BAD =
  /fail|error|drop|reject|lost|timeout|time-out|\bred\b|unhealthy|\bdown\b|crash|restart|disconnect|refus|denied|exceed|throttl|\bbad\b/i;
const GOOD =
  /success|recover|\bgreen\b|healthy|\bok\b|available|\bup\b|complete|passed|resolved|restored|succeeded/i;

/** Events that are about things getting better: their trend is read as good unless it says otherwise. */
const GOOD_KINDS = ['recovery', 'mitigation'];
/** Events that are about things going wrong: their trend is read as bad unless it says otherwise. */
const BAD_KINDS = ['failure', 'customer_impact', 'root_cause', 'alert', 'condition'];

/**
 * Whether a trend's number is bad or good, so it can be coloured red or green. The words of the
 * series name decide ("failed bulk writes" is bad, "Plans succeeded" is good); when it names both or
 * neither, the kind of event it belongs to does: a failure's trend is bad, a recovery's is good.
 */
export const getTrendTone = (kind: string, seriesName: string | undefined): TrendTone => {
  const name = seriesName ?? '';
  const isBad = BAD.test(name);
  const isGood = GOOD.test(name);
  if (isGood && !isBad) return 'good';
  if (isBad && !isGood) return 'bad';
  if (GOOD_KINDS.includes(kind)) return 'good';
  if (BAD_KINDS.includes(kind)) return 'bad';
  return 'neutral';
};

/**
 * The series of a chart to draw as the event's trend. For what went wrong it is the one that is the
 * trouble (failures, errors); for a recovery it is the one that shows things getting better
 * (successes, recovered), else the trouble that went away.
 */
export const pickTrendSeries = <T extends { name: string }>(
  kind: string,
  series: readonly T[] | undefined
): T | undefined => {
  if (!series || series.length === 0) return undefined;
  const bad = series.find(({ name }) => BAD.test(name) && !GOOD.test(name));
  const good = series.find(({ name }) => GOOD.test(name) && !BAD.test(name));
  return (GOOD_KINDS.includes(kind) ? good ?? bad : bad ?? good) ?? series[0];
};
