/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import inquirer from 'inquirer';
import type { DistinctChoice } from 'inquirer';
import {
  BACK_OPTION_VALUE,
  LIST_WITH_BACK_PROMPT,
  registerListWithBackPrompt,
} from './list_with_back_prompt';

export interface ChoiceItem<TValue> {
  name: string;
  value: TValue;
  short?: string;
  disabled?: boolean | string;
}

export type PromptChoice<TValue> = ChoiceItem<TValue> | InstanceType<typeof inquirer.Separator>;

export function createBackChoice(label = 'Back'): ChoiceItem<typeof BACK_OPTION_VALUE> {
  return {
    name: label,
    value: BACK_OPTION_VALUE,
    short: label,
  };
}

export function withBackChoice<TValue>(
  choices: Array<PromptChoice<TValue>>,
  label = 'Back'
): Array<PromptChoice<TValue | typeof BACK_OPTION_VALUE>> {
  return [...choices, new inquirer.Separator(), createBackChoice(label)];
}

export function isBack<TValue>(
  value: TValue | typeof BACK_OPTION_VALUE
): value is typeof BACK_OPTION_VALUE {
  return value === BACK_OPTION_VALUE;
}

export async function promptList<TValue>(options: {
  message: string;
  choices: Array<PromptChoice<TValue | typeof BACK_OPTION_VALUE>>;
  pageSize?: number;
  defaultValue?: TValue;
  loop?: boolean;
}): Promise<TValue | typeof BACK_OPTION_VALUE> {
  registerListWithBackPrompt();

  const promptChoices = options.choices as unknown as Array<
    DistinctChoice<Record<string, TValue | typeof BACK_OPTION_VALUE>>
  >;

  const answers = await inquirer.prompt<{ selection: TValue | typeof BACK_OPTION_VALUE }>([
    {
      type: LIST_WITH_BACK_PROMPT,
      name: 'selection',
      message: options.message,
      choices: promptChoices,
      pageSize: options.pageSize,
      default: options.defaultValue,
      loop: options.loop,
    },
  ]);

  return answers.selection;
}

export async function promptInput(options: {
  message: string;
  defaultValue?: string;
  allowEmpty?: boolean;
}): Promise<string | typeof BACK_OPTION_VALUE> {
  const answers = await inquirer.prompt<{ value: string }>([
    {
      type: 'input',
      name: 'value',
      message: options.message,
      default: options.defaultValue,
      filter: (value: string) => value.trim(),
    },
  ]);

  if (answers.value.toLowerCase() === 'q') {
    return BACK_OPTION_VALUE;
  }

  if (!options.allowEmpty && answers.value === '') {
    return options.defaultValue ?? '';
  }

  return answers.value;
}

export { BACK_OPTION_VALUE } from './list_with_back_prompt';
