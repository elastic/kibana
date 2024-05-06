/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  LogsExplorerLocatorParams,
  LOGS_EXPLORER_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { LogsExplorerLocatorDependencies } from './types';

export type LogsExplorerLocator = LocatorPublic<LogsExplorerLocatorParams>;

export class LogsExplorerLocatorDefinition implements LocatorDefinition<LogsExplorerLocatorParams> {
  public readonly id = LOGS_EXPLORER_LOCATOR_ID;

  constructor(protected readonly deps: LogsExplorerLocatorDependencies) {}

  public readonly getLocation = (params: LogsExplorerLocatorParams) => {
    const { dataset, columns } = params;
    const dataViewSpec: DataViewSpec | undefined = dataset
      ? {
          id: dataset,
          title: dataset,
        }
      : undefined;

    const discoverColumns = columns?.map((column) => {
      return column.type === 'document-field' ? column.field : column.smartField;
    });

    return this.deps.discoverAppLocator?.getLocation({
      ...params,
      columns: discoverColumns,
      dataViewId: dataset,
      dataViewSpec,
    })!;
  };
}
