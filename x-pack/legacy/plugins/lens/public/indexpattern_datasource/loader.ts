/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SavedObjectsClientContract, SavedObjectAttributes, HttpSetup } from 'src/core/public';
import { SimpleSavedObject } from 'src/core/public';
import { StateSetter } from '../types';
import {
  IndexPattern,
  IndexPatternRef,
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternField,
} from './types';
import { updateLayerIndexPattern } from './state_helpers';
import { DateRange, ExistingFields } from '../../../../../plugins/lens/common/types';
import { BASE_API_URL } from '../../../../../plugins/lens/common';
import { documentField } from './document_field';
import {
  indexPatterns as indexPatternsUtils,
  IFieldType,
  IndexPatternTypeMeta,
} from '../../../../../../src/plugins/data/public';

interface SavedIndexPatternAttributes extends SavedObjectAttributes {
  title: string;
  timeFieldName: string | null;
  fields: string;
  fieldFormatMap: string;
  typeMeta: string;
}

type SetState = StateSetter<IndexPatternPrivateState>;
type SavedObjectsClient = Pick<SavedObjectsClientContract, 'find' | 'bulkGet'>;
type ErrorHandler = (err: Error) => void;

export async function loadIndexPatterns({
  patterns,
  savedObjectsClient,
  cache,
}: {
  patterns: string[];
  savedObjectsClient: SavedObjectsClient;
  cache: Record<string, IndexPattern>;
}) {
  const missingIds = patterns.filter(id => !cache[id]);

  if (missingIds.length === 0) {
    return cache;
  }

  const resp = await savedObjectsClient.bulkGet(
    missingIds.map(id => ({ id, type: 'index-pattern' }))
  );

  return resp.savedObjects.reduce(
    (acc, savedObject) => {
      const indexPattern = fromSavedObject(
        savedObject as SimpleSavedObject<SavedIndexPatternAttributes>
      );
      acc[indexPattern.id] = indexPattern;
      return acc;
    },
    { ...cache }
  );
}

export async function loadInitialState({
  state,
  savedObjectsClient,
  defaultIndexPatternId,
}: {
  state?: IndexPatternPersistedState;
  savedObjectsClient: SavedObjectsClient;
  defaultIndexPatternId?: string;
}): Promise<IndexPatternPrivateState> {
  const indexPatternRefs = await loadIndexPatternRefs(savedObjectsClient);
  const requiredPatterns = _.unique(
    state
      ? Object.values(state.layers)
          .map(l => l.indexPatternId)
          .concat(state.currentIndexPatternId)
      : [defaultIndexPatternId || indexPatternRefs[0].id]
  );

  const currentIndexPatternId = requiredPatterns[0];
  const indexPatterns = await loadIndexPatterns({
    savedObjectsClient,
    cache: {},
    patterns: requiredPatterns,
  });

  if (state) {
    return {
      ...state,
      currentIndexPatternId,
      indexPatternRefs,
      indexPatterns,
      showEmptyFields: false,
      existingFields: {},
    };
  }

  return {
    currentIndexPatternId,
    indexPatternRefs,
    indexPatterns,
    layers: {},
    showEmptyFields: false,
    existingFields: {},
  };
}

export async function changeIndexPattern({
  id,
  savedObjectsClient,
  state,
  setState,
  onError,
}: {
  id: string;
  savedObjectsClient: SavedObjectsClient;
  state: IndexPatternPrivateState;
  setState: SetState;
  onError: ErrorHandler;
}) {
  try {
    const indexPatterns = await loadIndexPatterns({
      savedObjectsClient,
      cache: state.indexPatterns,
      patterns: [id],
    });

    setState(s => ({
      ...s,
      layers: isSingleEmptyLayer(state.layers)
        ? _.mapValues(state.layers, layer => updateLayerIndexPattern(layer, indexPatterns[id]))
        : state.layers,
      indexPatterns: {
        ...s.indexPatterns,
        [id]: indexPatterns[id],
      },
      currentIndexPatternId: id,
    }));
  } catch (err) {
    onError(err);
  }
}

export async function changeLayerIndexPattern({
  indexPatternId,
  layerId,
  savedObjectsClient,
  state,
  setState,
  onError,
  replaceIfPossible,
}: {
  indexPatternId: string;
  layerId: string;
  savedObjectsClient: SavedObjectsClient;
  state: IndexPatternPrivateState;
  setState: SetState;
  onError: ErrorHandler;
  replaceIfPossible?: boolean;
}) {
  try {
    const indexPatterns = await loadIndexPatterns({
      savedObjectsClient,
      cache: state.indexPatterns,
      patterns: [indexPatternId],
    });

    setState(s => ({
      ...s,
      layers: {
        ...s.layers,
        [layerId]: updateLayerIndexPattern(s.layers[layerId], indexPatterns[indexPatternId]),
      },
      indexPatterns: {
        ...s.indexPatterns,
        [indexPatternId]: indexPatterns[indexPatternId],
      },
      currentIndexPatternId: replaceIfPossible ? indexPatternId : s.currentIndexPatternId,
    }));
  } catch (err) {
    onError(err);
  }
}

async function loadIndexPatternRefs(
  savedObjectsClient: SavedObjectsClient
): Promise<IndexPatternRef[]> {
  const result = await savedObjectsClient.find<{ title: string }>({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });

  return result.savedObjects
    .map(o => ({
      id: String(o.id),
      title: (o.attributes as { title: string }).title,
    }))
    .sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
}

export async function syncExistingFields({
  indexPatterns,
  dateRange,
  fetchJson,
  setState,
}: {
  dateRange: DateRange;
  indexPatterns: Array<{ id: string; timeFieldName?: string | null }>;
  fetchJson: HttpSetup['get'];
  setState: SetState;
}) {
  const emptinessInfo = await Promise.all(
    indexPatterns.map(pattern => {
      const query: Record<string, string> = {
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      };

      if (pattern.timeFieldName) {
        query.timeFieldName = pattern.timeFieldName;
      }

      return fetchJson({
        path: `${BASE_API_URL}/existing_fields/${pattern.id}`,
        query,
      }) as Promise<ExistingFields>;
    })
  );

  setState(state => ({
    ...state,
    existingFields: emptinessInfo.reduce((acc, info) => {
      acc[info.indexPatternTitle] = booleanMap(info.existingFieldNames);
      return acc;
    }, state.existingFields),
  }));
}

function booleanMap(keys: string[]) {
  return keys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<string, boolean>);
}

function isSingleEmptyLayer(layerMap: IndexPatternPrivateState['layers']) {
  const layers = Object.values(layerMap);
  return layers.length === 1 && layers[0].columnOrder.length === 0;
}

function fromSavedObject(
  savedObject: SimpleSavedObject<SavedIndexPatternAttributes>
): IndexPattern {
  const { id, attributes, type } = savedObject;
  const indexPattern = {
    ...attributes,
    id,
    type,
    title: attributes.title,
    fields: (JSON.parse(attributes.fields) as IFieldType[])
      .filter(
        field =>
          !indexPatternsUtils.isNestedField(field) && (!!field.aggregatable || !!field.scripted)
      )
      .concat(documentField) as IndexPatternField[],
    typeMeta: attributes.typeMeta
      ? (JSON.parse(attributes.typeMeta) as IndexPatternTypeMeta)
      : undefined,
    fieldFormatMap: attributes.fieldFormatMap ? JSON.parse(attributes.fieldFormatMap) : undefined,
  };

  const { typeMeta } = indexPattern;
  if (!typeMeta) {
    return indexPattern;
  }

  const newFields = [...(indexPattern.fields as IndexPatternField[])];

  if (typeMeta.aggs) {
    const aggs = Object.keys(typeMeta.aggs);
    newFields.forEach((field, index) => {
      const restrictionsObj: IndexPatternField['aggregationRestrictions'] = {};
      aggs.forEach(agg => {
        const restriction = typeMeta.aggs && typeMeta.aggs[agg] && typeMeta.aggs[agg][field.name];
        if (restriction) {
          restrictionsObj[agg] = restriction;
        }
      });
      if (Object.keys(restrictionsObj).length) {
        newFields[index] = { ...field, aggregationRestrictions: restrictionsObj };
      }
    });
  }

  return {
    id: indexPattern.id,
    title: indexPattern.title,
    timeFieldName: indexPattern.timeFieldName || undefined,
    fields: newFields,
  };
}
