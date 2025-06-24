/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mergeMigrationFunctionMaps } from '@kbn/kibana-utils-plugin/common';
import {
  customElementExpressionsMigrationsFactory,
  templateWorkpadExpressionsMigrationsFactory,
  workpadExpressionsMigrationsFactory,
} from './expressions';
import { CanvasSavedObjectTypeMigrationsDeps } from './types';
import { workpadMigrationsFactory as workpadMigrationsFactoryFn } from './workpad';

export const workpadMigrationsFactory = (deps: CanvasSavedObjectTypeMigrationsDeps) =>
  mergeMigrationFunctionMaps(
    workpadMigrationsFactoryFn(deps),
    workpadExpressionsMigrationsFactory(deps)
  );

export const templateWorkpadMigrationsFactory = (deps: CanvasSavedObjectTypeMigrationsDeps) =>
  templateWorkpadExpressionsMigrationsFactory(deps);

export const customElementMigrationsFactory = (deps: CanvasSavedObjectTypeMigrationsDeps) =>
  customElementExpressionsMigrationsFactory(deps);

export type { CanvasSavedObjectTypeMigrationsDeps } from './types';
