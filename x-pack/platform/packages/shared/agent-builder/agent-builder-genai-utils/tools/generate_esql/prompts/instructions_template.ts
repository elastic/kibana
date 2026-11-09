/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { readAssetOverride } from '../harness_assets';

export interface InstructionsTemplateParams {
  /**
   * The default LIMIT to use when no specific limit is requested by the user.
   */
  defaultLimit?: number;
  /**
   * If true, omits the instruction to use named parameters (?_tstart, ?_tend)
   * for time range filtering.
   */
  disableNamedParams?: boolean;
}

const DEFAULT_LIMIT = 100;

const TEMPLATE_FILE = Path.join(__dirname, 'instructions.md');

/**
 * The instruction block lives in `instructions.md` rather than inline, so the same text can be
 * replaced wholesale by the offline optimization loop (see `harness_assets.ts`) without touching
 * code. Two placeholders are supported: `{{defaultLimit}}` and a `{{#namedParams}}…
 * {{/namedParams}}` section that is dropped when named parameters are disabled.
 */
let bundledTemplate: string | undefined;

const loadTemplate = (): string => {
  const override = readAssetOverride('prompts/instructions.md');
  if (override !== undefined) {
    return override;
  }
  if (bundledTemplate === undefined) {
    bundledTemplate = Fs.readFileSync(TEMPLATE_FILE, 'utf8');
  }
  return bundledTemplate;
};

const renderTemplate = (
  template: string,
  { defaultLimit, disableNamedParams }: { defaultLimit: number; disableNamedParams: boolean }
): string =>
  template
    .replace(/\{\{#namedParams\}\}([\s\S]*?)\{\{\/namedParams\}\}/g, disableNamedParams ? '' : '$1')
    .replace(/\{\{defaultLimit\}\}/g, String(defaultLimit));

/**
 * Generates ES|QL query generation instructions with configurable limit values.
 * This is a copy of the instructions from the inference plugin, modified to support
 * custom row limits for Agent Builder's index search tool.
 */
export const getEsqlInstructions = (params: InstructionsTemplateParams = {}): string => {
  const { defaultLimit = DEFAULT_LIMIT, disableNamedParams = false } = params;
  return renderTemplate(loadTemplate(), { defaultLimit, disableNamedParams });
};
