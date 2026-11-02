/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CatalogueArrayField,
  CatalogueComponentDefinition,
  CatalogueObjectField,
  ComponentCatalogue,
} from '@kbn/streams-schema';
import fixture from '../../services/component_catalogue/catalogue_snapshot/components_v1.json';

export const testCatalogue = fixture as ComponentCatalogue;

export const addFieldsDefinition = (): CatalogueComponentDefinition => {
  const definition = testCatalogue.definitions.find(({ type }) => type === 'add_fields');
  if (!definition) {
    throw new Error('add_fields definition missing from the catalogue fixture');
  }
  return definition;
};

export const addFieldsItemField = (): CatalogueObjectField => {
  const [fieldsField] = addFieldsDefinition().fields;
  const items = (fieldsField as CatalogueArrayField).items;
  if (items.type !== 'object') {
    throw new Error('add_fields items are expected to be objects');
  }
  return items;
};
