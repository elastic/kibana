/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface BaseReturnType {
  error?: {
    message: string;
    code?: number;
  };
  success: boolean;
}

export interface ReturnTypeCreate<T> extends BaseReturnType {
  item: T;
  action: 'created';
}

export interface ReturnTypeUpdate<T> extends BaseReturnType {
  item: T;
  action: 'updated';
}

export interface ReturnTypeCreate<T> extends BaseReturnType {
  item: T;
  success: boolean;
  action: 'created';
  error?: {
    message: string;
    code?: number;
  };
}

export interface ReturnTypeBulkCreate<T> extends BaseReturnType {
  results: Array<{
    item: T;
    success: boolean;
    action: 'created';
    error?: {
      message: string;
      code?: number;
    };
  }>;
}

// delete
export interface ReturnTypeDelete extends BaseReturnType {
  action: 'deleted';
}

export interface ReturnTypeCheckin extends BaseReturnType {
  action: 'checkin';
  actions: Array<{
    id: string;
    type: string;
    data?: object;
  }>;
}

export interface ReturnTypeBulkDelete extends BaseReturnType {
  results: Array<{
    id: string;
    success: boolean;
    action: 'deleted';
    error?: {
      message: string;
      code?: number;
    };
  }>;
}

// upsert
export interface ReturnTypeUpsert<T> extends BaseReturnType {
  item: T;
  action: 'created' | 'updated';
}

// upsert bulk
export interface ReturnTypeBulkUpsert extends BaseReturnType {
  results: Array<{
    success: boolean;
    action: 'created' | 'updated';
    error?: {
      message: string;
      code?: number;
    };
  }>;
}

export interface ReturnTypeBulkUnenroll extends BaseReturnType {
  results: Array<{
    id: string;
    success: boolean;
    action: 'unenrolled';
    error?: {
      message: string;
    };
  }>;
}

// list
export interface ReturnTypeList<T> extends BaseReturnType {
  list: T[];
  page: number;
  total: number;
  perPage: number;
}

// get
export interface ReturnTypeGet<T> extends BaseReturnType {
  item: T;
}

export interface ReturnTypeBulkGet<T> extends BaseReturnType {
  items: T[];
}

// action -- e.g. validate config block. Like ES simulate endpoint
export interface ReturnTypeAction extends BaseReturnType {
  result: {
    [key: string]: any;
  };
}
// e.g.
// {
//   result: {
//     username: { valid: true },
//     password: { valid: false, error: 'something' },
//     hosts: [
//       { valid: false }, { valid: true },
//     ]
//   }
// }

// bulk action -- e.g. assign tags to beats
export interface ReturnTypeBulkAction extends BaseReturnType {
  results?: Array<{
    success: boolean;
    result?: {
      [key: string]: any;
    };
    error?: {
      message: string;
      code?: number;
    };
  }>;
}
