/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Either } from 'fp-ts/Either';
import { PathLike } from 'fs';
import { archives } from './utils';

export interface TimeTakenToLoadArchive {
  label: string;
  archiveName: string;
  timeTaken: {
    milliseconds: number;
  };
}
export type SideEffectVoid = void;
export interface LoadResult {
  name: string;
  label?: string;
  metrics?: any[];
  avg: number | string | undefined;
  min: number | undefined | string;
  max: number | undefined | string;
}
export type LoadResults = Set<LoadResult>;
export type String2Void = (x: string) => void;
export type AnyStringOrInvalidDateTime = string | 'Invalid DateTime';
export interface ArchiveLoadMetrics {
  archive: {
    name: string;
    beforeLoadTimeStamp: AnyStringOrInvalidDateTime;
    afterLoadTimeStamp: AnyStringOrInvalidDateTime;
    diff: {
      milliseconds: number;
    };
  };
}
export interface EsArchiverLoadTestResult {
  archive: { name: string; beforeLoadTimeStamp: string; afterLoadTimeStamp: string; diff: any };
}
export type PromiseEitherFn = (x: PathLike) => Promise<Either<Error, void>>;
export type PossibleLogDirNames = 'log' | 'logs' | 'appex-qa-team-is-awesome';
type PossibleLogDirPaths = 'test/functional/apps/is_es_archiver_slow/' | string;
export type RelativeLogDirectoryName = `${PossibleLogDirPaths}${PossibleLogDirNames}`;
export type YesOrNo = 'yes' | 'no';
export type OneDecimalStr = `${string}.${string}`;
export interface FinalResult {
  name: string;
  avg: OneDecimalStr;
  min: OneDecimalStr;
  max: OneDecimalStr;
}
export type RuntimeEnv = 'LOCAL' | 'ESS' | 'SERVERLESS';
export type MarkdownMetricsTriplet = `${OneDecimalStr} / ${OneDecimalStr} / ${OneDecimalStr}`;
export type ArchiveWithManyFieldsAndOrManyDocs = typeof archives[number];
