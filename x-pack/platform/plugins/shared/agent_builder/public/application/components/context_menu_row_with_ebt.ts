/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

export interface ContextMenuRowWithEbt {
  name: ReactNode;
  icon: string;
  onClick: () => void;
  'data-test-subj'?: string;
  'data-ebt-element'?: string;
  'data-ebt-action'?: string;
  'data-ebt-detail'?: string;
}
