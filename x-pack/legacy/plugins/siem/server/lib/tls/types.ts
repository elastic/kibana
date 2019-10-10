/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';

export interface TlsAdapter {
  getTls(request: FrameworkRequest, options: RequestBasicOptions): Promise<DomainsData>;
}

export interface TlsBuckets {
  key: string;
  timestamp?: {
    value: number;
    value_as_string: string;
  };

  alternative_names: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  common_names: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  ja3: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  issuer_names: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  not_after: {
    buckets: Readonly<Array<{ key: number; key_as_string: string; doc_count: number }>>;
  };
}
