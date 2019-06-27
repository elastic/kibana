/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';

import * as extensions from './extensions.json';

const languageMap: { [key: string]: string } = extensions;

// patch the lib
languageMap['.ts'] = 'typescript';
languageMap['.tsx'] = 'typescript';

function detectByFilename(file: string): string {
  const ext = path.extname(file);
  if (ext) {
    return languageMap[ext];
  }
  return 'other'; // TODO: if how should we deal with other types?
}

// function readFile(file: string) {
//   return new Promise<string>((resolve, reject) =>
//     fs.readFile(file, 'utf8', (err, content) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(content);
//       }
//     })
//   );
// }

export function detectLanguageByFilename(filename: string) {
  const lang = detectByFilename(filename);
  return lang && lang.toLowerCase();
}

export async function detectLanguage(file: string, fileContent?: Buffer | string): Promise<any> {
  const lang = detectByFilename(file);
  return await Promise.resolve(lang ? lang.toLowerCase() : null);
  // if (!lang) {
  //   let content: string;
  //   if (fileContent) {
  //     content = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf8');
  //   } else {
  //     content = await readFile(file);
  //   }
  //   lang = detect.contents(file, content);
  //   return lang ? lang.toLowerCase() : null;
  // } else {
  //   return Promise.resolve(lang.toLowerCase());
  // }
}
