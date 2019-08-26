/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface TemplateListItem {
  name: string;
  indexPatterns: string[];
  version?: number;
  order?: number;
  hasSettings: boolean;
  hasAliases: boolean;
  hasMappings: boolean;
  ilmPolicy?: {
    name: string;
  };
}
export interface Template {
  name: string;
  indexPatterns: string[];
  version?: number | '';
  order?: number | '';
  settings?: string;
  aliases?: string;
  mappings?: string;
  ilmPolicy?: {
    name: string;
  };
}

export interface TemplateEs {
  name: string;
  index_patterns: string[];
  version?: number;
  order?: number;
  settings?: {
    [key: string]: any;
    index?: {
      [key: string]: any;
      lifecycle?: {
        name: string;
      };
    };
  };
  aliases?: {
    [key: string]: any;
  };
  mappings?: object;
}
