/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Fields,
  NormalizedField,
  NormalizedFields,
} from '../../../../../components/mappings_editor/types';
import type { UpdateElserMappingsModalProps } from './update_elser_mappings_modal';

export const setIsModalOpen: UpdateElserMappingsModalProps['setIsModalOpen'] = jest.fn();
export const refetchMapping = jest.fn();

const createNormalizedSemanticTextField = ({
  id,
  name,
  inferenceId = '.elser-2-elasticsearch',
}: {
  id: string;
  name: string;
  inferenceId?: string;
}): NormalizedField => ({
  id,
  path: [name],
  source: { name, type: 'semantic_text', inference_id: inferenceId },
  parentId: undefined,
  nestedDepth: 0,
  isMultiField: false,
  childFieldsName: 'fields',
  canHaveChildFields: false,
  hasChildFields: false,
  canHaveMultiFields: true,
  hasMultiFields: false,
  childFields: undefined,
  isExpanded: false,
});

export const createMappingViewFieldsFixture = (): NormalizedFields => ({
  byId: {
    first: createNormalizedSemanticTextField({ id: 'first', name: 'name' }),
    second: createNormalizedSemanticTextField({ id: 'second', name: 'text' }),
  },
  aliases: {},
  rootLevelFields: ['first', 'second'],
  maxNestedDepth: 0,
});

export const defaultDenormalizedMappings: Fields = {
  name: {
    type: 'semantic_text',
    inference_id: '.elser-2-elastic',
  },
};
