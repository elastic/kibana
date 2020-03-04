/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from './vector_source';
import { ISource } from './source';
import { IndexPattern } from '../../../../../../../src/plugins/data/public';

export interface IESSource extends ISource {
  getIndexPattern(): Promise<IndexPattern>;
}

export class AbstractESSource extends AbstractVectorSource implements IESSource {
  getIndexPattern(): Promise<IndexPattern>;
}
