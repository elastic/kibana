/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nunjucks from 'nunjucks';
import { join as joinPath } from 'path';
import type { CelInput, InputType } from '../../common';
import { createSync, ensureDirSync, readSync } from '../util';

export function createAgentInput(
  specificDataStreamDir: string,
  inputTypes: InputType[],
  celInput: CelInput | undefined
): void {
  const agentDir = joinPath(specificDataStreamDir, 'agent', 'stream');
  const agentTemplatesDir = joinPath(__dirname, '../templates/agent');
  ensureDirSync(agentDir);

  // Load common options that exists for all .yml.hbs files, to be merged with each specific input file
  const commonFilePath = joinPath(agentTemplatesDir, 'common.yml.hbs');
  const commonFile = readSync(commonFilePath);

  for (const inputType of inputTypes) {
    const destinationFilePath = joinPath(agentDir, `${inputType}.yml.hbs`);
    if (inputType === 'cel' && celInput != null) {
      const mappedValues = {
        auth: celInput.authType,
        needsAuthBlock: celInput.needsAuthConfigBlock,
        configFields: Object.keys(celInput.configFields),
      } as object;
      const generatedCelTemplate = nunjucks.render('cel_generated.yml.hbs.njk', mappedValues);

      createSync(destinationFilePath, generatedCelTemplate);
    } else {
      const inputTypeFilePath = joinPath(
        agentTemplatesDir,
        `${inputType.replaceAll('-', '_')}.yml.hbs`
      );
      const inputTypeFile = readSync(inputTypeFilePath);

      const combinedContents = `${inputTypeFile}\n${commonFile}`;

      createSync(destinationFilePath, combinedContents);
    }
  }
}
