/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type * as LensCommon from '@kbn/lens-common';
import type * as Operations from '../operations';
import type * as LayerHelpers from '../layer_helpers';
import type * as OperationMocks from '../mocks';

const actualOperations = await vi.importActual<typeof Operations>('../operations');
const actualHelpers = await vi.importActual<typeof LayerHelpers>('../layer_helpers');
const actualTimeScaleUtils = await vi.importActual<typeof LensCommon>('@kbn/lens-common');
const actualMocks = await vi.importActual<typeof OperationMocks>('../mocks');

vi.spyOn(actualOperations.operationDefinitionMap.date_histogram, 'paramEditor');
vi.spyOn(actualOperations.operationDefinitionMap.terms, 'onOtherColumnChanged');
vi.spyOn(actualHelpers, 'copyColumn');
vi.spyOn(actualHelpers, 'insertOrReplaceColumn');
vi.spyOn(actualHelpers, 'insertNewColumn');
vi.spyOn(actualHelpers, 'replaceColumn');
vi.spyOn(actualHelpers, 'adjustColumnReferencesForChangedColumn');
vi.spyOn(actualHelpers, 'getErrorMessages');
vi.spyOn(actualHelpers, 'getColumnOrder');

export const {
  getAvailableOperationsByMetadata,
  memoizedGetAvailableOperationsByMetadata,
  getOperations,
  getOperationDisplay,
  getOperationTypesForField,
  getOperationResultType,
  operationDefinitionMap,
  operationDefinitions,
  getInvalidFieldMessage,
} = actualOperations;

export const {
  copyColumn,
  insertOrReplaceColumn,
  insertNewColumn,
  replaceColumn,
  getColumnOrder,
  deleteColumn,
  updateColumnParam,
  sortByField,
  hasField,
  updateLayerIndexPattern,
  mergeLayer,
  isColumnTransferable,
  getErrorMessages,
  isReferenced,
  resetIncomplete,
  isOperationAllowedAsReference,
  canTransition,
  isColumnValidAsReference,
  adjustColumnReferencesForChangedColumn,
  getManagedColumnsFrom,
} = actualHelpers;

export const { adjustTimeScaleLabelSuffix, DEFAULT_TIME_SCALE } = actualTimeScaleUtils;

export const { createMockedFullReference } = actualMocks;
