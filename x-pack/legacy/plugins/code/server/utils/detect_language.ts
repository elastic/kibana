/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import fs from 'fs';

function matchAll(s: string, re: RegExp): string[][] {
  let m;
  const result = [];
  while ((m = re.exec(s)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === re.lastIndex) {
      re.lastIndex++;
    }
    result.push(m);
  }
  return result;
}

const entryFilePath = require.resolve('monaco-editor/esm/vs/basic-languages/monaco.contribution');
const languageMap: { [key: string]: string } = {};
if (entryFilePath) {
  const entryFileContent = fs.readFileSync(entryFilePath, 'utf8');
  const importRegex = /import '(.*\.contribution\.js)'/gm;
  const dir = path.dirname(entryFilePath);
  const regex = /id:\s*'(.*)',\s*extensions:\s*\[(.+)\]/gm;

  for (const m of matchAll(entryFileContent, importRegex)) {
    const contributionFile = path.join(dir, m[1]);
    if (fs.existsSync(contributionFile)) {
      const contributionContent = fs.readFileSync(contributionFile, 'utf8');
      for (const mm of matchAll(contributionContent, regex)) {
        const langId = mm[1];
        const extensions = mm[2];
        for (let ext of extensions.split(',')) {
          ext = ext.trim().slice(1, -1);
          languageMap[ext] = langId;
        }
      }
    }
  }
}
function detectByFilename(file: string): string {
  const ext = path.extname(file);
  if (ext) {
    return languageMap[ext];
  }
  return 'other'; // TODO: if how should we deal with other types?
}

export function detectLanguageByFilename(filename: string) {
  const lang = detectByFilename(filename);
  return lang && lang.toLowerCase();
}

export async function detectLanguage(file: string, fileContent?: Buffer | string): Promise<any> {
  const lang = detectByFilename(file);
  return await Promise.resolve(lang ? lang.toLowerCase() : null);
}
