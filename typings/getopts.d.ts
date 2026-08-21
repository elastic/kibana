/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare module 'getopts' {
  function getopts(argv: string[], options?: getopts.Options): getopts.ParsedOptions;

  namespace getopts {
    interface ParsedOptions {
      _: string[];
      [key: string]: any;
    }

    interface Options {
      alias?: Record<string, string | string[]>;
      string?: string[];
      boolean?: string[];
      default?: Record<string, any>;
      unknown?: (optionName: string) => boolean;
      stopEarly?: boolean;
    }
  }

  export = getopts;
}
