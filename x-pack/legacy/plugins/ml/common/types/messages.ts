/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MessageBasics {
  message: string;
  level: string;
  timestamp: number;
  node_name: string;
  text?: string;
}

export interface TransformMessage extends MessageBasics {
  transform_id: string;
}

export interface JobMessage extends MessageBasics {
  job_id: string;
}
