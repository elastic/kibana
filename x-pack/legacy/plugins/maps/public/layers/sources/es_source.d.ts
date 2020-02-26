/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource, IVectorSource } from './vector_source';
import { IField } from '../fields/field';

export interface IESSource extends IVectorSource {
  getMetricFields(): IField[];
}

export class AbstractESSource extends AbstractVectorSource implements IESSource {
  getMetricFields(): IField[];
}
