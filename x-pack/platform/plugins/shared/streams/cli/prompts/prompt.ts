/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInterface, type Interface } from 'readline';

export interface PromptOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

let rl: Interface | null = null;

function getReadline(options: PromptOptions = {}): Interface {
  if (!rl) {
    rl = createInterface({
      input: options.input || process.stdin,
      output: options.output || process.stdout,
    });
  }
  return rl;
}

export function closePrompt(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
}

/**
 * Ask for confirmation (yes/no)
 */
export async function confirm(
  question: string,
  options: PromptOptions & { default?: boolean } = {}
): Promise<boolean> {
  const readline = getReadline(options);
  const defaultValue = options.default ?? false;
  const defaultPrompt = defaultValue ? 'Y/n' : 'y/N';

  return new Promise((resolve) => {
    readline.question(`${question} [${defaultPrompt}] `, (input) => {
      let value = defaultValue;

      if (input != null && input !== '') {
        value = /^y(es)?/i.test(input);
      }

      resolve(value);
    });
  });
}

/**
 * Ask for text input
 */
export async function input(
  question: string,
  options: PromptOptions & { defaultValue?: string } = {}
): Promise<string> {
  const readline = getReadline(options);
  const defaultPrompt = options.defaultValue ? ` (${options.defaultValue})` : '';

  return new Promise((resolve) => {
    readline.question(`${question}${defaultPrompt}: `, (value) => {
      resolve(value || options.defaultValue || '');
    });
  });
}

/**
 * Ask user to select from a list of options
 */
export async function select<T extends string>(
  question: string,
  choices: Array<{ value: T; label: string }>,
  options: PromptOptions = {}
): Promise<T> {
  const readline = getReadline(options);
  const output = options.output || process.stdout;

  output.write(`${question}\n`);
  choices.forEach((choice, index) => {
    output.write(`  ${index + 1}. ${choice.label}\n`);
  });

  return new Promise((resolve) => {
    const askForSelection = () => {
      readline.question('> ', (answer) => {
        const num = parseInt(answer, 10);
        if (num >= 1 && num <= choices.length) {
          resolve(choices[num - 1].value);
        } else {
          output.write(`Please enter a number between 1 and ${choices.length}\n`);
          askForSelection();
        }
      });
    };
    askForSelection();
  });
}

/**
 * Ask user to select multiple items from a list
 */
export async function multiSelect<T extends string>(
  question: string,
  choices: Array<{ value: T; label: string }>,
  options: PromptOptions = {}
): Promise<T[]> {
  const readline = getReadline(options);
  const output = options.output || process.stdout;

  output.write(`${question} (enter comma-separated numbers, or 'all')\n`);
  choices.forEach((choice, index) => {
    output.write(`  ${index + 1}. ${choice.label}\n`);
  });

  return new Promise((resolve) => {
    const askForSelection = () => {
      readline.question('> ', (answer) => {
        if (answer.toLowerCase() === 'all') {
          resolve(choices.map((c) => c.value));
          return;
        }

        const nums = answer.split(',').map((s) => parseInt(s.trim(), 10));
        const valid = nums.every((n) => n >= 1 && n <= choices.length);

        if (valid && nums.length > 0) {
          resolve(nums.map((n) => choices[n - 1].value));
        } else {
          output.write(
            `Please enter comma-separated numbers between 1 and ${choices.length}, or 'all'\n`
          );
          askForSelection();
        }
      });
    };
    askForSelection();
  });
}

/**
 * Read JSON from stdin
 */
export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', reject);
  });
}

/**
 * Parse JSON from stdin or file
 */
export async function readJsonInput(filePath?: string): Promise<unknown> {
  if (filePath) {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  const content = await readStdin();
  return JSON.parse(content);
}
