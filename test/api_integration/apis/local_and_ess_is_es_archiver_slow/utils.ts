/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint no-console: ["error",{ allow: ["log"] }] */

import { resolve } from 'path';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { writeFileSync } from 'fs';
import { pipe, flow } from 'fp-ts/function';
import { DateTime } from 'luxon';
import * as TE from 'fp-ts/lib/TaskEither';
import type { Either } from 'fp-ts/lib/Either';
import { range } from 'fp-ts/Array';
import { toError } from 'fp-ts/Either';
import fs from 'fs/promises';
import { PathLike } from 'fs';
import { EsArchiver } from '@kbn/es-archiver';
import { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import * as os from 'node:os';
import dedent from 'dedent';
import byteSize from 'byte-size';

import type {
  PromiseEitherFn,
  ArchiveLoadMetrics,
  EsArchiverLoadTestResult,
  SideEffectVoid,
  TimeTakenToLoadArchive,
  LoadResults,
  YesOrNo,
  ArchiveWithManyFieldsAndOrManyDocs,
  String2Void,
  FinalResult,
  RuntimeEnv,
} from './shared.types';
import { LoadResult } from './shared.types';
import { computeAverageMinMax } from './calc';
import { markdownify } from './markdown';

export const logPathAndFileName = (logDirectory: PathLike) =>
  `${logDirectory}/${process.env.LOG_FILE_NAME ?? 'es_archiver_load_times_log.txt'}`;
export const mkDirAndIgnoreAllErrors: PromiseEitherFn = (logDirPath: PathLike) =>
  pipe(
    logDirPath,
    TE.tryCatch(async () => await fs.mkdir(logDirPath), pipe(toError))
  );

export const absolutePathForLogsDirectory: (rel: string) => PathLike = (rel: string): string =>
  resolve(REPO_ROOT, rel);

const encoding = 'utf8';
const appendUtf8 = { flag: 'a', encoding };
const overwriteUtf8 = { flag: 'w', encoding };

export const ioFlushBefore = (dest: string) => (x: any) => {
  const writeToFile = writeFileSync.bind(null, dest);
  // @ts-ignore
  writeToFile(`${JSON.stringify(x, null, 2)}\n`, overwriteUtf8);
};

export const ioFlushAfter = (dest: string) => (x: any) => {
  const writeToFile = writeFileSync.bind(null, dest);
  // // @ts-ignore
  // writeToFile(`${JSON.stringify(x, null, 2)}\n`, appendUtf8);
  // @ts-ignore
  writeToFile(`${x}\n`, appendUtf8);
};

export const ioFlush = (dest: string): ((x: EsArchiverLoadTestResult) => void) => {
  const writeToFile = writeFileSync.bind(null, dest);

  // TODO-TRE: Fix the following by using Pick or Omit (not sure really), not into leaving ts-ignore comments everywhere.
  /*
   TS2345: Argument of type '{ flag: string; encoding: string; }' is not assignable to parameter of type 'WriteFileOptions | undefined'.   Type '{ flag: string; encoding: string; }' is not assignable to type 'ObjectEncodingOptions & Abortable & { mode?: Mode | undefined; flag?: string | undefined; }'.     Type '{ flag: string; encoding: string; }' is not assignable to type 'ObjectEncodingOptions'.       Types of property 'encoding' are incompatible.         Type 'string' is not assignable to type 'BufferEncoding | null | undefined'.
   */
  // @ts-ignore
  const appendAndNewLine = (x: EsArchiverLoadTestResult) => writeToFile(`${x}\n`, appendUtf8);
  return function flushEsArchiverLoadResults(x: EsArchiverLoadTestResult): void {
    pipe(
      x,
      (a) => JSON.stringify(a, null, 2) as unknown as EsArchiverLoadTestResult,
      appendAndNewLine
    );
  };
};

export const fmt = 'H:mm:SSS';
export const luxonNow = (): DateTime => DateTime.fromISO(DateTime.now().toString());
export const formatLuxon = (d: DateTime): string => d.toLocaleString(DateTime.DATETIME_MED);
export const lazyNow = flow(luxonNow, formatLuxon);
export const diff: any = (before: any, after: any) => after.diff(before).toObject();
export function metricsFactory(resultSet: LoadResults) {
  return function metricPushFactory(a: TimeTakenToLoadArchive): SideEffectVoid {
    const { archiveName, label, timeTaken } = a;
    const xs = [...resultSet];
    // @ts-ignore
    const found: LoadResult = xs.find((lr: LoadResult): boolean => {
      return lr.name === archiveName;
    });
    found.label = label;
    found.metrics!.push(timeTaken);
    resultSet.add(found);
  };
}
export const compositionChain =
  (
    loadUnloadAndGetMetrics: (
      arg0: number,
      arg1: string
    ) => ArchiveLoadMetrics | PromiseLike<ArchiveLoadMetrics>
  ) =>
  (
    push: (arg0: {
      archiveName: string;
      label: string;
      timeTaken: { milliseconds: number };
    }) => void
  ) =>
  (logDirAbsolutePath: any) =>
    async function loadAndFlushCompositionChain(
      archive: string,
      i: number,
      label: string
    ): Promise<Either<Error, void>> {
      return await pipe(
        TE.tryCatch(
          async (): Promise<ArchiveLoadMetrics> => await loadUnloadAndGetMetrics(i, archive),
          (reason: any) => toError(reason)
        ),
        TE.map((x: ArchiveLoadMetrics) => {
          push({
            archiveName: archive,
            label,
            timeTaken: x?.archive?.diff,
          });
          return x;
        }),
        TE.map(ioFlush(logPathAndFileName(logDirAbsolutePath)))
      )();
    };
const fake =
  (ms: number = 5) =>
  async (log: ToolingLog): Promise<{ bef: DateTime; aft: DateTime }> => {
    log.verbose(chalk.bold.cyanBright.underline(`\nλλλ Dry Running for ms: \n\t${ms}`));
    const bef = luxonNow();
    await new Promise((res) => setTimeout(res, ms));
    const aft = luxonNow();

    return {
      bef,
      aft,
    };
  };
const real =
  (esArchiver: EsArchiver) =>
  async (archive: string): Promise<{ bef: DateTime; aft: DateTime }> => {
    const bef = luxonNow();
    await esArchiver.load(archive);
    const aft = luxonNow();
    await esArchiver.unload(archive);

    return {
      bef,
      aft,
    };
  };
const work = async (
  esArchiver: EsArchiver,
  archive: string,
  dryRun: boolean = false,
  log: ToolingLog
): Promise<{ bef: DateTime; aft: DateTime }> =>
  dryRun ? await fake()(log) : await real(esArchiver)(archive);
export function loadAndTime(esArchiver: EsArchiver, dryRun: boolean = false, log: ToolingLog) {
  return async function getMetrics(
    loopIndex: number,
    archive: string
  ): Promise<ArchiveLoadMetrics> {
    const { bef, aft } = await work(esArchiver, archive, dryRun, log);

    return {
      archive: {
        name: archive,
        beforeLoadTimeStamp: bef.toFormat(fmt),
        afterLoadTimeStamp: aft.toFormat(fmt),
        diff: diff(bef, aft),
      },
    };
  };
}
export const isYesOrNo = (value: YesOrNo): boolean => {
  let result: boolean = false;
  switch (value) {
    case 'yes':
      result = true;
      break;
    case 'no':
      result = false;
      break;
    default:
      if (value !== 'yes' || value !== 'no') {
        throw createFlagError(`
!!! DRY_RUN cli argument must be either 'yes' or 'no'.
You provided: ${value}
`);
      }
  }
  return result;
};
export const isDryRun = (): boolean => {
  let dryRunCliArg: boolean = false;
  const value: YesOrNo = process.env.DRY_RUN as YesOrNo;
  if (value) dryRunCliArg = isYesOrNo(value);
  return dryRunCliArg;
};
export const id = (x: any) => x;
const fx = (a: FinalResult | string): string => `${chalk.bold.black.bgWhiteBright.underline(a)}`;
export const tap = (log: ToolingLog) => (environ: RuntimeEnv) => (x: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  environ === 'SERVERLESS' ? console.log(fx(x)) : log.info(fx(x));
  return x as unknown as FinalResult;
};
export const afterAll = (
  theEnv: RuntimeEnv,
  logDirAbsolutePath: PathLike,
  results: LoadResults
) => {
  const flushFinal = ioFlushAfter(logPathAndFileName(logDirAbsolutePath));

  return async function finalMetricsAndLogging(log: ToolingLog): Promise<void> {
    flushFinal(`λλλ FINAL METRICS @ ${lazyNow()}`);
    const tapLog = tap(log)(theEnv);
    // const tapLog = tap(log)('SERVERLESS');
    ((await computeAverageMinMax(results)) as FinalResult[])
      .map(function printEachJsonVerbose(x: FinalResult): FinalResult {
        log.verbose(
          chalk.bold.cyanBright.underline(
            `\nλλλ Avg, Min, and Max: \n${JSON.stringify(x, null, 2)}`
          )
        );
        return x;
      })
      .map((x: FinalResult) => pipe(markdownify(theEnv)(x), tapLog))
      .forEach(flushFinal);
    console.log(
      chalk.bold.cyanBright.underline(
        `\nλλλ Please see the log file: \n${pipe(logDirAbsolutePath, logPathAndFileName)}`
      )
    );
  };
};
const logLoops = (x: number): void => {
  const brightAndNoticeable = [
    `${chalk.bold.cyanBright.underline('λ Looping')} `,
    `${chalk.bold.bgMagenta.black(x)} `,
    `${chalk.bold.cyanBright.underline('time(s)')}\n`,
  ];
  console.log(brightAndNoticeable.join(''));
};
export const hardware = () =>
  dedent`
    λ os.arch -> ${os.arch()}
    λ os.platform -> ${os.platform()}
    λ os.totalmem -> ${pipe(os.totalmem(), byteSize)}
    λ os.freemem -> ${pipe(os.freemem(), byteSize)}
    λ CPU Count -> ${os.cpus().length}
  `;

const loud = (x: unknown): string => `${chalk.bold.cyanBright.underline(x)}`;
const pretty = (x: unknown) => JSON.stringify(x, null, 2);
const consoleLog = (x: unknown) => console.log(x);
const loudConsoleLog = (x: unknown) => pipe(x, loud, consoleLog);
const preLog = () => [pipe(archives, pretty), `\n${hardware()}`].forEach(loudConsoleLog);

export async function printInfoAndInitOutputLogging(
  log: ToolingLog,
  archives: ArchiveWithManyFieldsAndOrManyDocs[],
  logDirAbsolutePath: PathLike,
  loopCount: number
): Promise<void> {
  console.log('\nλ Test Loop for Measuring Es Archiver Perf');
  logLoops(loopCount);
  preLog();

  await mkDirAndIgnoreAllErrors(logDirAbsolutePath);
  ioFlushBefore(logPathAndFileName(logDirAbsolutePath))(
    `λλλ Init ${isDryRun() ? 'Dry Run ' : ''}Logging @ ${lazyNow()}`
  );
  ioFlushAfter(logPathAndFileName(logDirAbsolutePath))(hardware());
}
export function testsLoop(
  esArchiver: EsArchiver,
  log: ToolingLog,
  upperBound: number,
  dryRun: boolean = false,
  push: (arg0: { archiveName: string; label: string; timeTaken: { milliseconds: number } }) => void,
  logDirAbsolutePath: PathLike
): String2Void {
  const loadUnloadAndGetMetrics = loadAndTime(esArchiver, dryRun, log);

  return (archive: string): void => {
    const run = compositionChain(loadUnloadAndGetMetrics)(push)(logDirAbsolutePath);

    range(1, upperBound).forEach((i: number): void => {
      const label = `Load #${i} of Archive: [${archive}]`;
      it(label, async function runDataDrivenTestBlock(): Promise<void> {
        await run(archive, i, label);
      });
    });
  };
}
export const LOOP_LIMIT: number = (process.env.LOOP_LIMIT as unknown as number) ?? 50;
export const archives = [
  'x-pack/test/functional/es_archives/logstash_functional',
  'test/functional/fixtures/es_archiver/many_fields',
  'x-pack/test/functional/es_archives/ml/farequote',
] as const;
