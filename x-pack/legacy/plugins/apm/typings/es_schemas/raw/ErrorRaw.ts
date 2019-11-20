/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMBaseDoc } from './APMBaseDoc';
import { Container } from './fields/Container';
import { Host } from './fields/Host';
import { Http } from './fields/Http';
import { Kubernetes } from './fields/Kubernetes';
import { Page } from './fields/Page';
import { Process } from './fields/Process';
import { Service } from './fields/Service';
import { IStackframe } from './fields/Stackframe';
import { Url } from './fields/Url';
import { User } from './fields/User';

interface Processor {
  name: 'error';
  event: 'error';
}

export interface Exception {
  message?: string; // either message or type are given
  type?: string;
  module?: string;
  handled?: boolean;
  stacktrace?: IStackframe[];
  [key: string]: unknown;
}

interface Log {
  message: string;
  stacktrace?: IStackframe[];
  [key: string]: unknown;
}

export interface ErrorRaw extends APMBaseDoc {
  processor: Processor;
  transaction?: {
    id: string;
    sampled?: boolean;
    type: string;
  };
  error: {
    id: string;
    culprit?: string;
    grouping_key: string;
    // either exception or log are given
    exception?: Exception[];
    page?: Page; // special property for RUM: shared by error and transaction
    log?: Log;
    custom?: Record<string, unknown>;
  };
  [key: string]: unknown;

  // Shared by errors and transactions
  container?: Container;
  host?: Host;
  http?: Http;
  kubernetes?: Kubernetes;
  process?: Process;
  service: Service;
  url?: Url;
  user?: User;
}
