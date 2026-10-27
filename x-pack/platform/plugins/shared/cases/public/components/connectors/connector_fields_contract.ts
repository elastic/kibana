/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { z } from '@kbn/zod/v4';
import { useFormContext, useWatch } from 'react-hook-form';
import { ConnectorTypes } from '../../../common/types/domain';
import type { CaseActionConnector } from '../types';
import type { CaseConnectorsRegistry } from './types';
import { getCaseConnectors } from '.';

/**
 * How connector-specific fields mount in a react-hook-form parent form (create case, edit
 * connector, case view sidebar):
 *
 * 1. The parent renders `<FormProvider>` and `<ConnectorFieldsForm connector={...} />`. Connector
 *    `fieldsComponent`s take no form props; they read the form with `useFormContext`.
 * 2. Every connector field lives under the `fields` path: `<TextField name={getConnectorFieldName('x')} />`.
 *    A connector reads sibling values with `useConnectorFields`, not `useFormData`.
 * 3. The parent validates with `zodResolver(schema)` where `schema.fields` is
 *    `getConnectorFieldsSchema(connector, registry)`, rebuilt when the selected connector changes.
 *    The schema comes from the connector's `fieldsSchema`, so no per-field `rules` exist.
 * 4. The connector's `defaultFields` initialise `fields` (`getConnectorDefaultFields`), since fields
 *    that were never touched have no value for the schema to validate.
 * 5. react-hook-form keeps values of unmounted fields, so when the selected connector changes the
 *    parent must call the function from `useResetConnectorFields()` with the new connector, otherwise
 *    the previous connector's values would be submitted.
 */
export const CONNECTOR_FIELDS_NAME = 'fields';

export const getConnectorFieldName = (key: string): string => `${CONNECTOR_FIELDS_NAME}.${key}`;

const getRegistry = (): CaseConnectorsRegistry => getCaseConnectors().caseConnectorsRegistry;

export const getConnectorFieldsSchema = (
  connector: CaseActionConnector | null,
  registry: CaseConnectorsRegistry = getRegistry()
): z.ZodType => {
  if (connector == null || connector.actionTypeId === ConnectorTypes.none) {
    return z.null().optional();
  }

  if (!registry.has(connector.actionTypeId)) {
    return z.unknown();
  }

  return registry.get(connector.actionTypeId).fieldsSchema ?? z.unknown();
};

export const getConnectorDefaultFields = (
  connector: CaseActionConnector | null,
  registry: CaseConnectorsRegistry = getRegistry()
): Record<string, unknown> | null => {
  if (connector == null || !registry.has(connector.actionTypeId)) {
    return null;
  }

  const { defaultFields } = registry.get(connector.actionTypeId);

  return defaultFields ? { ...defaultFields } : null;
};

/** Subscribes to the connector `fields` of the parent form; replaces `useFormData<{ fields }>()`. */
export const useConnectorFields = <TFields>(): TFields | null | undefined =>
  useWatch({ name: CONNECTOR_FIELDS_NAME }) as TFields | null | undefined;

/** Returns a function that replaces `fields` with the defaults of the newly selected connector. */
export const useResetConnectorFields = (): ((connector: CaseActionConnector | null) => void) => {
  const { setValue } = useFormContext();

  return useCallback(
    (connector) =>
      setValue(CONNECTOR_FIELDS_NAME, getConnectorDefaultFields(connector), { shouldDirty: true }),
    [setValue]
  );
};
