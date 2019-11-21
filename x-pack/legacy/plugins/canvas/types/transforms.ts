/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArgumentConfig } from './arguments';

export interface TransformSpec<Arguments = {}> {
  /** The name of the function to create a transform section in the sidebar for */
  name: string;
  /** The name to display */
  displayName: string;
  /** A description of what is rendered */
  help?: string;
  /** A list of arguments to display in the  */
  args: Array<ArgumentConfig<Arguments>>;
}

export type TransformFactory<Arguments = {}> = () => TransformSpec<Arguments>;
