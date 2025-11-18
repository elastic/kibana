/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import inquirer from 'inquirer';
import type { Key } from 'readline';
import ListPrompt from 'inquirer/lib/prompts/list.js';

export const LIST_WITH_BACK_PROMPT = 'list-with-back';
export const BACK_OPTION_VALUE = '__back__';

class ListWithBackPrompt extends ListPrompt {
  private readonly onKeypress = (_: string, key: Key) => {
    if (!this.isBackShortcut(key)) {
      return;
    }

    const backIndex = this.opt.choices.realChoices.findIndex(
      (choice) => choice.value === BACK_OPTION_VALUE
    );

    if (backIndex === -1) {
      return;
    }

    this.selected = backIndex;
    this.render();
    this.onSubmit(BACK_OPTION_VALUE);
  };

  public override _run(cb: (value: unknown) => void) {
    this.getInputStream().on('keypress', this.onKeypress);

    return super._run((value) => {
      this.getInputStream().removeListener('keypress', this.onKeypress);
      cb(value);
    });
  }

  public override close() {
    this.getInputStream().removeListener('keypress', this.onKeypress);
    super.close();
  }

  private isBackShortcut(key?: Key) {
    return key?.name === 'q' && !key.ctrl && !key.meta;
  }

  private getInputStream() {
    return (this.rl as unknown as { input?: NodeJS.ReadStream }).input ?? process.stdin;
  }
}

let isRegistered = false;

export function registerListWithBackPrompt() {
  if (isRegistered) {
    return;
  }

  inquirer.registerPrompt(LIST_WITH_BACK_PROMPT, ListWithBackPrompt as any);
  isRegistered = true;
}
