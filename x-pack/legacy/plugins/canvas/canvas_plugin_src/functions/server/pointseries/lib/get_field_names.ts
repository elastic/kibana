/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type Arg =
  | string
  | number
  | {
      name: string;
      args: Arg[];
    };

export function getFieldNames(names: string[], arg: Arg): string[] {
  if (typeof arg === 'object' && arg.args !== undefined) {
    return names.concat(arg.args.reduce(getFieldNames, []));
  }

  if (typeof arg === 'string') {
    return names.concat(arg);
  }

  return names;
}
