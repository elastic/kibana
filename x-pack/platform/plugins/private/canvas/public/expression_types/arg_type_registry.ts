/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Registry } from '@kbn/interpreter';
import { ArgType, ArgTypeProps } from './arg_type';

class ArgTypeRegistry extends Registry<ArgTypeProps, ArgType> {
  wrapper(obj: ArgTypeProps) {
    return new ArgType(obj);
  }
}

export const argTypeRegistry = new ArgTypeRegistry();
