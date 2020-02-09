/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import { isString } from 'lodash';
import { getExportType as getTypeCsv } from '../../export_types/csv';
import { getExportType as getTypeCsvFromSavedObject } from '../../export_types/csv_from_savedobject';
import { getExportType as getTypePng } from '../../export_types/png';
import { getExportType as getTypePrintablePdf } from '../../export_types/printable_pdf';
import { ExportTypeDefinition } from '../../types';

type GetCallbackFn<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType> = (
  item: ExportTypeDefinition<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType>
) => boolean;
// => ExportTypeDefinition<T, U, V, W>

export class ExportTypesRegistry {
  private _map: Map<string, ExportTypeDefinition<any, any, any, any>> = new Map();

  constructor() {}

  register<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType>(
    item: ExportTypeDefinition<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType>
  ): void {
    if (!isString(item.id)) {
      throw new Error(`'item' must have a String 'id' property `);
    }

    if (this._map.has(item.id)) {
      throw new Error(`'item' with id ${item.id} has already been registered`);
    }

    // TODO: Unwrap the execute function from the item's executeJobFactory
    // Move that work out of server/lib/create_worker to reduce dependence on ESQueue
    this._map.set(item.id, item);
  }

  getAll() {
    return Array.from(this._map.values());
  }

  getSize() {
    return this._map.size;
  }

  getById<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType>(
    id: string
  ): ExportTypeDefinition<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType> {
    if (!this._map.has(id)) {
      throw new Error(`Unknown id ${id}`);
    }

    return this._map.get(id) as ExportTypeDefinition<
      JobParamsType,
      CreateJobFnType,
      JobPayloadType,
      ExecuteJobFnType
    >;
  }

  get<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType>(
    findType: GetCallbackFn<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType>
  ): ExportTypeDefinition<JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType> {
    let result;
    for (const value of this._map.values()) {
      if (!findType(value)) {
        continue; // try next value
      }
      const foundResult: ExportTypeDefinition<
        JobParamsType,
        CreateJobFnType,
        JobPayloadType,
        ExecuteJobFnType
      > = value;

      if (result) {
        throw new Error('Found multiple items matching predicate.');
      }

      result = foundResult;
    }

    if (!result) {
      throw new Error('Found no items matching predicate');
    }

    return result;
  }
}

function getExportTypesRegistryFn(): ExportTypesRegistry {
  const registry = new ExportTypesRegistry();

  /* this replaces the previously async method of registering export types,
   * where this would run a directory scan and types would be registered via
   * discovery */
  const getTypeFns: Array<() => ExportTypeDefinition<any, any, any, any>> = [
    getTypeCsv,
    getTypeCsvFromSavedObject,
    getTypePng,
    getTypePrintablePdf,
  ];
  getTypeFns.forEach(getType => {
    registry.register(getType());
  });
  return registry;
}

// FIXME: is this the best way to return a singleton?
export const getExportTypesRegistry = memoizeOne(getExportTypesRegistryFn);
