/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SavedObjectsClientContract } from 'src/core/public';
import { IndexPatternField, IndexPattern, markExistingFields, DateRange } from '../../../common';
import { IndexPatternColumn, isColumnTransferable, operationDefinitionMap } from '../operations';
import { StateSetter, IndexPatternListItem } from '../../types';
import { npStart } from '../../../../../../../src/legacy/ui/public/new_platform';

export { OperationType, IndexPatternColumn } from '../operations';

export interface DraggedField {
  field: IndexPatternField;
  indexPatternId: string;
}

export interface IndexPatternLayer {
  columnOrder: string[];
  columns: Record<string, IndexPatternColumn>;
  // Each layer is tied to the index pattern that created it
  indexPatternId: string;
}

export interface IndexPatternPersistedState {
  currentIndexPatternId: string;
  layers: Record<string, IndexPatternLayer>;
}

export type IndexPatternPrivateState = IndexPatternPersistedState & {
  indexPatterns: Record<string, IndexPatternListItem>;
  showEmptyFields: boolean;
  indexPatternMap: Record<string, IndexPattern | undefined>;
};

export type SetState = StateSetter<IndexPatternPrivateState>;

type ErrorHandler = (error: Error) => void;

interface ActionsContext {
  state: IndexPatternPrivateState;
  setState: SetState;
  dateRange: DateRange;
}

interface InitialContext {
  onError: ErrorHandler;
}

type FullContext = ActionsContext & InitialContext;

export class Actions {
  private setState: SetState;
  private state: IndexPatternPrivateState;
  private dateRange: DateRange;
  private onError: ErrorHandler;

  constructor(context: FullContext) {
    this.state = context.state;
    this.setState = context.setState;
    this.dateRange = context.dateRange;
    this.onError = context.onError;
  }

  private fetchIndexPattern = async (id: string) => {
    const indexPattern = this.state.indexPatternMap[id];

    if (indexPattern) {
      return indexPattern;
    }

    return fetchIndexPattern(id, this.dateRange);
  };

  public setContext(context: FullContext) {
    this.state = context.state;
    this.setState = context.setState;
    this.dateRange = context.dateRange;
  }

  public toggleEmptyFields = () => {
    this.setState(s => ({ ...s, showEmptyFields: !s.showEmptyFields }));
  };

  public syncEmptyFields = async (indexPatternIds: string[]) => {
    const indexPatterns = await Promise.all(
      indexPatternIds.map(async id => {
        const indexPattern = this.state.indexPatternMap[id];

        if (!indexPattern) {
          return this.fetchIndexPattern(id);
        }

        const emptyFields = await npStart.core.http.get(`/api/lens/empty_fields/${id}`, {
          query: (this.dateRange as unknown) as Record<string, string>,
        });

        return markExistingFields(indexPattern, emptyFields);
      })
    ).catch(this.onError);

    if (!indexPatterns) {
      return;
    }

    this.setState(s => ({
      ...s,
      indexPatternMap: indexPatterns.reduce(
        (acc, indexPattern) => ({
          ...acc,
          [indexPattern.id]: indexPattern,
        }),
        s.indexPatternMap
      ),
    }));
  };

  public setCurrentIndexPattern = async (id: string) => {
    const newIndexPattern = await this.fetchIndexPattern(id).catch(this.onError);

    if (!newIndexPattern) {
      return;
    }

    this.setState(s => ({
      ...s,
      indexPatternMap: assignIndexPattern(newIndexPattern, s.indexPatternMap),
      layers: isSingleEmptyLayer(s.layers)
        ? _.mapValues(s.layers, layer => updateLayerIndexPattern(layer, newIndexPattern))
        : s.layers,
      currentIndexPatternId: id,
    }));
  };

  public setLayerIndexPattern = async ({ id, layerId }: { id: string; layerId: string }) => {
    const newIndexPattern = await this.fetchIndexPattern(id).catch(this.onError);

    if (!newIndexPattern) {
      return;
    }

    this.setState(s => ({
      ...s,
      indexPatternMap: assignIndexPattern(newIndexPattern, s.indexPatternMap),
      layers: {
        ...s.layers,
        [layerId]: updateLayerIndexPattern(s.layers[layerId], newIndexPattern),
      },
    }));
  };
}

export function createActionsFactory(initialContext: InitialContext) {
  let instance: Actions;

  return {
    getInitialState,

    withContext(context: ActionsContext) {
      const fullContext = { ...context, ...initialContext };
      instance = instance || new Actions(fullContext);
      instance.setContext(fullContext);
      return instance;
    },
  };
}

function isSingleEmptyLayer(layerMap: IndexPatternPrivateState['layers']) {
  const layers = Object.values(layerMap);
  return layers.length === 1 && layers[0].columnOrder.length === 0;
}

function updateLayerIndexPattern(
  layer: IndexPatternLayer,
  newIndexPattern: IndexPattern
): IndexPatternLayer {
  const keptColumns: IndexPatternLayer['columns'] = _.pick(layer.columns, column =>
    isColumnTransferable(column, newIndexPattern)
  );
  const newColumns: IndexPatternLayer['columns'] = _.mapValues(keptColumns, column => {
    const operationDefinition = operationDefinitionMap[column.operationType];
    return operationDefinition.transfer
      ? operationDefinition.transfer(column, newIndexPattern)
      : column;
  });
  const newColumnOrder = layer.columnOrder.filter(columnId => newColumns[columnId]);

  return {
    ...layer,
    indexPatternId: newIndexPattern.id,
    columns: newColumns,
    columnOrder: newColumnOrder,
  };
}

async function fetchIndexPatternList(
  savedObjectsClient: SavedObjectsClientContract
): Promise<IndexPatternListItem[]> {
  const result = await savedObjectsClient.find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });

  return result.savedObjects.map(item => ({
    id: item.id,
    title: String(item.attributes.title),
  }));
}

function fetchIndexPattern(id: string, dateRange?: DateRange) {
  return npStart.core.http.get(`/api/lens/index_patterns/${id}`, {
    query: (dateRange as unknown) as Record<string, string>,
  });
}

async function getInitialState(
  savedObjectsClient: SavedObjectsClientContract,
  state?: IndexPatternPersistedState
): Promise<IndexPatternPrivateState> {
  const indexPatterns = await fetchIndexPatternList(savedObjectsClient);
  const [firstIndexPattern] = indexPatterns;
  const currentIndexPatternId = (state && state.currentIndexPatternId) || firstIndexPattern.id;

  const fullIndexPatterns = !state
    ? []
    : await Promise.all(
        Object.values(state.layers).map(layer => fetchIndexPattern(layer.indexPatternId))
      );

  return {
    currentIndexPatternId,
    layers: {},
    ...(state || {}),
    indexPatterns: indexPatterns.reduce(
      (acc, pattern) => {
        acc[pattern.id] = pattern;
        return acc;
      },
      {} as Record<string, IndexPatternListItem>
    ),
    indexPatternMap: fullIndexPatterns.reduce((acc, indexPattern) => {
      acc[indexPattern.id] = indexPattern;
      return acc;
    }, {}),
    showEmptyFields: false,
  };
}

function assignIndexPattern(
  indexPattern: IndexPattern,
  indexPatternMap: Record<string, IndexPattern | undefined>
): Record<string, IndexPattern | undefined> {
  return {
    ...indexPatternMap,
    [indexPattern.id]: indexPattern,
  };
}
