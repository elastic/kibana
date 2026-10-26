/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFlags } from '@kbn/dev-cli-runner';

export type ProfilerCliFlags = BaseFlags<{
  port?: string;
  ['inspector-port']?: string;
  pid?: string;
  timeout?: string;
  grep?: string;
  c?: string;
  connections?: string;
  a?: string;
  amount?: string;
  t?: string;
  spawn?: boolean;
  heap?: boolean;
}>;

export const DEFAULT_INSPECTOR_PORT = 9229;

export const NO_GREP = '__NO_GREP__';
