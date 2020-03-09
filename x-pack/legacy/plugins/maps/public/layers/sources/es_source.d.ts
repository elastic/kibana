/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from './vector_source';
import { IVectorSource } from './vector_source';
import { IndexPattern } from '../../../../../../../src/plugins/data/public';

export interface IESSource extends IVectorSource {
  getIndexPattern(): Promise<IndexPattern>;
}

export class AbstractESSource extends AbstractVectorSource implements IESSource {
  getIndexPattern(): Promise<IndexPattern>;
}
