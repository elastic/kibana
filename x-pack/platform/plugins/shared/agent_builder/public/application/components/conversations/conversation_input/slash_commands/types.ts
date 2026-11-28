/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';

/** A command typed as `/name args` in the composer and run in the browser instead of being sent. */
export interface SlashCommand {
  /** Text typed after `/`, for example `thread`. Lowercase. */
  readonly name: string;
  readonly description: string;
  readonly iconType: IconType;
  /** Set when the command cannot run here. Hidden from the menu, refused with this message when typed. */
  readonly unavailableReason?: string;
  /** Runs the command with the text typed after its name, trimmed. Rejects when it fails. */
  readonly run: (args: string) => Promise<void>;
}
