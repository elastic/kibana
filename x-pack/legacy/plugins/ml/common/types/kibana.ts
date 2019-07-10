/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// custom edits or fixes for default kibana types which are incomplete

import { IndexPattern } from 'ui/index_patterns';

// the type property is missing from the official IndexPattern interface
export interface IndexPatternWithType extends IndexPattern {
  type?: string;
}

export type IndexPatternTitle = string;

export type callWithRequestType = (action: string, params?: any) => Promise<any>;
