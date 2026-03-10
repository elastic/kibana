/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLMessage, EditorError } from '@kbn/esql-ast';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import Fs from 'fs/promises';
import Path from 'path';
import yargs, { Argv } from 'yargs';
import type { ToolingLog } from '@kbn/tooling-log';
import { run } from '@kbn/dev-cli-runner';
import { INLINE_ESQL_QUERY_REGEX } from '../../common/tasks/nl_to_esql/constants';
import type { FileToWrite } from '../load_esql_docs/generate_doc';

interface SyntaxError {
  query: string;
  errors: Array<ESQLMessage | EditorError>;
}

/**
 * Log out syntax errors and also write them to a {outDir}/__tmp__/syntax-errors.json
 * If docsToCheck is provided, they will be used instead of reading the files from the outDir.
 * @param docFiles - The files to check for syntax errors.
 * @param outDir - The directory to write the syntax errors to.
 * @param log - The logger to use.
 */
export const reportSyntaxErrors = async (
  outDir: string,
  log: ToolingLog,
  docsToCheck?: FileToWrite[]
) => {
  let docFiles: FileToWrite[] | undefined = docsToCheck;
  if (docsToCheck) {
    log.info(`Checking syntax for ${docsToCheck.length} provided files`);
  } else {
    log.info(`Checking syntax for files in ${outDir}`);
    docFiles = await Fs.readdir(outDir).then(async (files) => {
      return await Promise.all(
        files
          .filter((file) => file.endsWith('.txt'))
          .map(async (file) => {
            const content = await Fs.readFile(Path.join(outDir, file), 'utf8');
            return {
              name: file,
              content,
            };
          })
      );
    });
    log.info(`Found ${(docFiles ?? []).length} files to check in ${outDir}`);
  }

  if (!docFiles) return;

  const syntaxErrors = (
    await Promise.all(docFiles.map(async (file) => await findEsqlSyntaxError(file)))
  ).flat();

  log.warning(
    `Please verify the following queries that had syntax errors\n${JSON.stringify(
      syntaxErrors,
      null,
      2
    )}`
  );
  if (syntaxErrors.length > 0) {
    const tmpDir = Path.join(outDir, '__tmp__');
    await Fs.mkdir(tmpDir).catch((error) => (error.code === 'EEXIST' ? Promise.resolve() : error));
    const syntaxErrorsFile = Path.join(tmpDir, 'syntax-errors.json');
    await Fs.writeFile(syntaxErrorsFile, JSON.stringify(syntaxErrors, null, 2));
    log.info(`Syntax errors written to ${syntaxErrorsFile}`);
  }
};
const findEsqlSyntaxError = async (doc: FileToWrite): Promise<SyntaxError[]> => {
  return Array.from(doc.content.matchAll(INLINE_ESQL_QUERY_REGEX)).reduce(
    async (listP, [match, query]) => {
      const list = await listP;
      const { errors, warnings } = await validateQuery(query, {
        // setting this to true, we don't want to validate the index / fields existence
        ignoreOnMissingCallbacks: true,
      });

      const all = [...errors, ...warnings];
      if (all.length) {
        list.push({
          errors: all,
          query,
        });
      }

      return list;
    },
    Promise.resolve([] as SyntaxError[])
  );
};

yargs(process.argv.slice(2))
  .command(
    '*',
    'Extract ES|QL documentation',
    (y: Argv) =>
      y
        .option('logLevel', {
          describe: 'Log level',
          string: true,
          default: process.env.LOG_LEVEL || 'info',
          choices: ['info', 'debug', 'silent', 'verbose'],
        })
        .option('outDir', {
          describe: 'The directory to write the syntax errors to.',
          default: Path.join(__dirname, '../../server/tasks/nl_to_esql/esql_docs'),
        })
        .parse(),
    (argv) => {
      run(
        async ({ log }) => {
          const outDir = argv.outDir as string;
          await reportSyntaxErrors(outDir, log);
        },
        { log: { defaultLevel: argv.logLevel as any }, flags: { allowUnexpected: true } }
      );
    }
  )
  .parse();
