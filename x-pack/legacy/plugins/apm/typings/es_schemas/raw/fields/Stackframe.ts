/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type IStackframeBase = {
  function?: string;
  library_frame?: boolean;
  exclude_from_grouping?: boolean;
  context?: {
    post?: string[];
    pre?: string[];
  };
  vars?: {
    [key: string]: unknown;
  };
  line: {
    number: number;
  };
} & ({ classname: string } | { filename: string });

export type IStackframeWithLineContext = IStackframeBase & {
  line: {
    number: number;
    context: string;
  };
};

export type IStackframe = IStackframeBase | IStackframeWithLineContext;
