/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IFieldType } from '../../../../../src/plugins/data/common/index_patterns/fields';

export interface ISourceDescriptor {
  id: string;
  type: string;
}

export interface ILayerDescriptor {
  sourceDescriptor: ISourceDescriptor;
  id: string;
}
