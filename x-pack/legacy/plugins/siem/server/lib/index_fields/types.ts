/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexField } from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { RequestFacade } from '../../types';

type IndexFieldsRequest = RequestFacade & {
  payload: {
    variables: {
      defaultIndex: string[];
    };
  };
};

export type FrameworkFieldsRequest = FrameworkRequest<IndexFieldsRequest>;

export interface FieldsAdapter {
  getIndexFields(req: FrameworkFieldsRequest, indices: string[]): Promise<IndexField[]>;
}

export interface IndexFieldDescriptor {
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
}
