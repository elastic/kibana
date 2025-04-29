/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import {
  SavedObjectAttributesWithReferences,
  SavedObjectReferenceResolutionError,
} from '../../references';
import { LogViewSavedObjectAttributes } from '../types';

export const logIndicesDataViewReferenceName = 'log-indices-data-view-0';

export const extractLogIndicesSavedObjectReferences = (
  unextractedAttributes: LogViewSavedObjectAttributes
): SavedObjectAttributesWithReferences<LogViewSavedObjectAttributes> => {
  if (unextractedAttributes.logIndices.type === 'data_view') {
    const logDataViewReference: SavedObjectReference = {
      id: unextractedAttributes.logIndices.dataViewId,
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      name: logIndicesDataViewReferenceName,
    };
    const attributes: LogViewSavedObjectAttributes = {
      ...unextractedAttributes,
      logIndices: {
        ...unextractedAttributes.logIndices,
        dataViewId: logDataViewReference.name,
      },
    };
    return {
      attributes,
      references: [logDataViewReference],
    };
  } else {
    return {
      attributes: unextractedAttributes,
      references: [],
    };
  }
};

export const resolveLogIndicesSavedObjectReferences = (
  attributes: LogViewSavedObjectAttributes,
  references: SavedObjectReference[]
): LogViewSavedObjectAttributes => {
  if (attributes.logIndices?.type === 'data_view') {
    const logDataViewReference = references.find(
      (reference) => reference.name === logIndicesDataViewReferenceName
    );

    if (logDataViewReference == null) {
      throw new SavedObjectReferenceResolutionError(
        `Failed to resolve log data view reference "${logIndicesDataViewReferenceName}".`
      );
    }

    return {
      ...attributes,
      logIndices: {
        ...attributes.logIndices,
        dataViewId: logDataViewReference.id,
      },
    };
  } else {
    return attributes;
  }
};
