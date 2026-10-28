/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type {
  CatalogueComponentKind,
  CatalogueMetadata,
  CatalogueSignal,
} from '@kbn/streams-schema';
import type { FieldErrors } from './values';

export interface ComponentReferenceOption {
  id: string;
  kind: CatalogueComponentKind;
}

export interface DefinitionFormContextValue {
  metadata: CatalogueMetadata;
  telemetry: readonly CatalogueSignal[];
  errors: FieldErrors;
  componentRefs: readonly ComponentReferenceOption[];
  idPrefix: string;
  /** Controls that hold text they cannot turn into a value (e.g. invalid JSON) report it here. */
  reportUnparsedInput: (controlId: string, isUnparsed: boolean) => void;
}

export const DefinitionFormContext = createContext<DefinitionFormContextValue | undefined>(
  undefined
);

export const useDefinitionFormContext = (): DefinitionFormContextValue => {
  const context = useContext(DefinitionFormContext);
  if (!context) {
    throw new Error('useDefinitionFormContext must be used inside ComponentDefinitionForm');
  }
  return context;
};
