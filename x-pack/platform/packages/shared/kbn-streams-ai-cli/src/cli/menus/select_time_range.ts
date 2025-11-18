/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promptList, withBackChoice, isBack } from '../prompt/prompt';
import { TIME_RANGE_OPTIONS, getTimeRangeById } from '../time_range';

export async function promptTimeRangeSelection({
  currentId,
  statusLine,
}: {
  currentId: string;
  statusLine: string;
}): Promise<string | undefined> {
  const current = getTimeRangeById(currentId);
  const selection = await promptList<string>({
    message: `Select time range\n${statusLine}\nChoose a range:`,
    choices: withBackChoice(
      TIME_RANGE_OPTIONS.map((option) => ({
        name: `${option.label}${option.id === current.id ? ' (current)' : ''}`,
        value: option.id,
      }))
    ),
    defaultValue: current.id,
  });

  if (isBack(selection)) {
    return undefined;
  }

  return selection;
}
