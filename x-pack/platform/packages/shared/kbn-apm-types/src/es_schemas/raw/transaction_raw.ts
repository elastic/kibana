/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMBaseDoc } from './apm_base_doc';
import type { Cloud } from './fields/cloud';
import type { Container } from './fields/container';
import type { EventOutcome } from './fields/event_outcome';
import type { Host } from './fields/host';
import type { Http } from './fields/http';
import type { Kubernetes } from './fields/kubernetes';
import type { Page } from './fields/page';
import type { Process } from './fields/process';
import type { Service } from './fields/service';
import type { TimestampUs } from './fields/timestamp_us';
import type { Url } from './fields/url';
import type { User } from './fields/user';
import type { UserAgent } from './fields/user_agent';
import type { Faas } from './fields/faas';
import type { SpanLink } from './fields/span_links';
import type { Server } from './fields/server';

interface Processor {
  name: 'transaction';
  event: 'transaction';
}

export interface TransactionRaw extends APMBaseDoc {
  processor: Processor;
  timestamp: TimestampUs;
  trace: { id: string }; // trace is required
  event?: { outcome?: EventOutcome };
  transaction: {
    duration: { us: number };
    id: string;
    marks?: {
      // "agent": not defined by APM Server - only sent by RUM agent
      agent?: {
        [name: string]: number;
      };
    };
    name?: string;
    page?: Page; // special property for RUM: shared by error and transaction
    result?: string;
    sampled: boolean;
    span_count?: {
      started?: number;
      dropped?: number;
    };
    type: string;
    custom?: Record<string, unknown>;
    message?: {
      queue?: { name: string };
      age?: { ms: number };
      body?: string;
      headers?: Record<string, unknown>;
    };
  };

  // Shared by errors and transactions
  container?: Container;
  ecs?: { version?: string };
  host?: Host;
  http?: Http;
  server?: Server;
  kubernetes?: Kubernetes;
  process?: Process;
  service: Service;
  url?: Url;
  user?: User;
  user_agent?: UserAgent;
  cloud?: Cloud;
  faas?: Faas;
  span?: {
    links?: SpanLink[];
  };
}
