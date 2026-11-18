/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DREAMING_TYPE_PATTERN } from '../../common/dreaming';
import type {
  DreamingTemplate,
  DreamingTemplateIndex,
  LoadedDreamingTemplate,
} from '../../common/dreaming_templates';

const TEMPLATES_DIR = path.join(__dirname, 'templates');

const readTemplateJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(path.join(TEMPLATES_DIR, file), 'utf8')) as T;

const loadDreamingTemplates = async (): Promise<readonly LoadedDreamingTemplate[]> => {
  const { templates } = await readTemplateJson<DreamingTemplateIndex>('index.json');
  return Promise.all(
    templates.map(async (summary) => {
      if (!DREAMING_TYPE_PATTERN.test(summary.id)) {
        throw new Error(`Invalid dreaming template id '${summary.id}'`);
      }
      const template = await readTemplateJson<DreamingTemplate>(`${summary.id}.json`);
      return { ...summary, ...template };
    })
  );
};

let cachedTemplates: Promise<readonly LoadedDreamingTemplate[]> | undefined;

/** Loads the built-in example dreaming configs in `index.json` order, caching them after the first read. */
export const getDreamingTemplates = (): Promise<readonly LoadedDreamingTemplate[]> => {
  if (!cachedTemplates) {
    cachedTemplates = loadDreamingTemplates().catch((error) => {
      cachedTemplates = undefined;
      throw error;
    });
  }
  return cachedTemplates;
};
