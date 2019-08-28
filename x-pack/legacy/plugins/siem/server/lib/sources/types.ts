/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceConfiguration } from './index';

export type PartialSourceConfigurations = {
  default?: PartialDefaultSourceConfiguration;
} & {
  [sourceId: string]: PartialSourceConfiguration;
};

export type PartialDefaultSourceConfiguration = {
  fields?: Partial<SourceConfiguration['fields']>;
} & Partial<Pick<SourceConfiguration, Exclude<keyof SourceConfiguration, 'fields'>>>;

export type PartialSourceConfiguration = {
  fields?: Partial<SourceConfiguration['fields']>;
} & Pick<SourceConfiguration, Exclude<keyof SourceConfiguration, 'fields'>>;
