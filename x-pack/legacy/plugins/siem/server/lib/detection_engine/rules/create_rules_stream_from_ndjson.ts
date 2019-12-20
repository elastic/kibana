/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Readable } from 'stream';
import { createSplitStream, createMapStream, createFilterStream } from 'src/legacy/utils/streams';
import { has } from 'lodash/fp';
import { RuleAlertParamsRest } from '../types';

export interface RulesObjectsExportResultDetails {
  /** number of successfully exported objects */
  exportedCount: number;
}

export const createRulesStreamFromNdJson = (ndJsonStream: Readable) => {
  return ndJsonStream
    .pipe(createSplitStream('\n'))
    .pipe(
      createMapStream((str: string) => {
        if (str && str.trim() !== '') {
          // TODO: Check maybe that this is valid here with the schema?
          return JSON.parse(str);
        }
      })
    )
    .pipe(
      createFilterStream<RuleAlertParamsRest | RulesObjectsExportResultDetails>(
        obj => !!obj && !has('exportedCount', obj)
      )
    );
};
