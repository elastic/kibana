/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import { IndexField } from '../../graphql/types';
import {
  baseCategoryFields,
  getDocumentation,
  getIndexAlias,
  hasDocumentation,
  IndexAlias,
} from '../../utils/beat_schema';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { FieldsAdapter, IndexFieldDescriptor } from './types';

type IndexesAliasIndices = Record<string, string[]>;

export class ElasticsearchIndexFieldAdapter implements FieldsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getIndexFields(request: FrameworkRequest, indices: string[]): Promise<IndexField[]> {
    const indexPatternsService = this.framework.getIndexPatternsService(request);
    const indexesAliasIndices: IndexesAliasIndices = indices.reduce(
      (accumulator: IndexesAliasIndices, indice: string) => {
        const key: string = getIndexAlias(request.payload.variables.defaultIndex, indice);
        if (get(key, accumulator)) {
          accumulator[key] = [...accumulator[key], indice];
        } else {
          accumulator[key] = [indice];
        }
        return accumulator;
      },
      {} as IndexesAliasIndices
    );
    const responsesIndexFields: IndexFieldDescriptor[][] = await Promise.all(
      Object.values(indexesAliasIndices).map(indicesByGroup =>
        indexPatternsService.getFieldsForWildcard({
          pattern: indicesByGroup,
        })
      )
    );
    return formatIndexFields(responsesIndexFields, Object.keys(
      indexesAliasIndices
    ) as IndexAlias[]);
  }
}

export const formatIndexFields = (
  responsesIndexFields: IndexFieldDescriptor[][],
  indexesAlias: IndexAlias[]
): IndexField[] =>
  responsesIndexFields
    .reduce(
      (accumulator: IndexField[], indexFields: IndexFieldDescriptor[], indexesAliasIdx: number) => [
        ...accumulator,
        ...indexFields.reduce((itemAccumulator: IndexField[], index: IndexFieldDescriptor) => {
          const alias: IndexAlias = indexesAlias[indexesAliasIdx];
          const splitName = index.name.split('.');
          const category = baseCategoryFields.includes(splitName[0]) ? 'base' : splitName[0];
          return [
            ...itemAccumulator,
            {
              ...(hasDocumentation(alias, index.name) ? getDocumentation(alias, index.name) : {}),
              ...index,
              category,
              indexes: [alias],
            } as IndexField,
          ];
        }, []),
      ],
      []
    )
    .reduce((accumulator: IndexField[], indexfield: IndexField) => {
      const alreadyExistingIndexField = accumulator.findIndex(acc => acc.name === indexfield.name);
      if (alreadyExistingIndexField > -1) {
        const existingIndexField = accumulator[alreadyExistingIndexField];
        return [
          ...accumulator.slice(0, alreadyExistingIndexField),
          {
            ...existingIndexField,
            indexes: [...existingIndexField.indexes, ...indexfield.indexes],
          },
          ...accumulator.slice(alreadyExistingIndexField + 1),
        ];
      }
      return [...accumulator, indexfield];
    }, []);
