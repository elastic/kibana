/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promptList, withBackChoice, isBack, type ChoiceItem } from '../prompt/prompt';
import { clearTerminal } from '../ui/terminal';

export type MainMenuChoice = 'selectStream' | 'selectConnector' | 'setTimeRange' | 'quit';

const CHOICES: Array<ChoiceItem<MainMenuChoice>> = [
  { name: 'Select stream', value: 'selectStream' },
  { name: 'Select connector', value: 'selectConnector' },
  { name: 'Set time range', value: 'setTimeRange' },
];

export async function promptMainMenu({
  statusLine,
}: {
  statusLine: string;
}): Promise<MainMenuChoice> {
  clearTerminal();
  const selection = await promptList<MainMenuChoice>({
    message: `Streams AI CLI\n${statusLine}\nChoose an option:`,
    choices: withBackChoice<MainMenuChoice>(CHOICES, 'Quit'),
  });

  if (isBack(selection)) {
    return 'quit';
  }

  return selection;
}
