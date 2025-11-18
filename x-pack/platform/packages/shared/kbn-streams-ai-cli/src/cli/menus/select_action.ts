/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promptList, withBackChoice, isBack } from '../prompt/prompt';
import type { StreamMenuItem } from '../types';
import { clearTerminal } from '../ui/terminal';

export async function selectAction({
  items,
  statusLine,
}: {
  items: StreamMenuItem[];
  statusLine: string;
}): Promise<StreamMenuItem | undefined> {
  if (!items.length) {
    throw new Error('No actions or workflows are available.');
  }

  clearTerminal();
  const selection = await promptList<string>({
    message: `Run workflow or action\n${statusLine}\nChoose an item:`,
    choices: withBackChoice(
      items.map((item) => {
        const label = item.kind === 'action' ? item.action.label : item.workflow.label;
        const description =
          item.kind === 'action' ? item.action.description : item.workflow.description;
        const id = item.kind === 'action' ? item.action.id : item.workflow.id;
        return {
          name: `${label} — ${description}`,
          value: id,
        };
      })
    ),
    loop: true,
  });

  if (isBack(selection)) {
    return undefined;
  }

  return items.find((item) =>
    item.kind === 'action' ? item.action.id === selection : item.workflow.id === selection
  );
}
