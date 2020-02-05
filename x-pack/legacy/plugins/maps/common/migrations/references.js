/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Can not use public Layer classes to extract references since this logic must run in both client and server.

import _ from 'lodash';
import { ES_GEO_GRID, ES_SEARCH, ES_PEW_PEW } from '../constants';

function doesSourceUseIndexPattern(layerDescriptor) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return sourceType === ES_GEO_GRID || sourceType === ES_SEARCH || sourceType === ES_PEW_PEW;
}

export function extractReferences({ attributes, references = [] }) {
  if (!attributes.layerListJSON) {
    return { attributes, references };
  }

  const extractedReferences = [];

  const layerList = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layer, layerIndex) => {
    // Extract index-pattern references from source descriptor
    if (doesSourceUseIndexPattern(layer) && _.has(layer, 'sourceDescriptor.indexPatternId')) {
      const refName = `layer_${layerIndex}_source_index_pattern`;
      extractedReferences.push({
        name: refName,
        type: 'index-pattern',
        id: layer.sourceDescriptor.indexPatternId,
      });
      delete layer.sourceDescriptor.indexPatternId;
      layer.sourceDescriptor.indexPatternRefName = refName;
    }

    // Extract index-pattern references from join
    const joins = _.get(layer, 'joins', []);
    joins.forEach((join, joinIndex) => {
      if (_.has(join, 'right.indexPatternId')) {
        const refName = `layer_${layerIndex}_join_${joinIndex}_index_pattern`;
        extractedReferences.push({
          name: refName,
          type: 'index-pattern',
          id: join.right.indexPatternId,
        });
        delete join.right.indexPatternId;
        join.right.indexPatternRefName = refName;
      }
    });
  });

  return {
    attributes: {
      ...attributes,
      layerListJSON: JSON.stringify(layerList),
    },
    references: references.concat(extractedReferences),
  };
}

function findReference(targetName, references) {
  const reference = references.find(reference => reference.name === targetName);
  if (!reference) {
    throw new Error(`Could not find reference "${targetName}"`);
  }
  return reference;
}

export function injectReferences({ attributes, references }) {
  if (!attributes.layerListJSON) {
    return { attributes };
  }

  const layerList = JSON.parse(attributes.layerListJSON);
  layerList.forEach(layer => {
    // Inject index-pattern references into source descriptor
    if (doesSourceUseIndexPattern(layer) && _.has(layer, 'sourceDescriptor.indexPatternRefName')) {
      const reference = findReference(layer.sourceDescriptor.indexPatternRefName, references);
      layer.sourceDescriptor.indexPatternId = reference.id;
      delete layer.sourceDescriptor.indexPatternRefName;
    }

    // Inject index-pattern references into join
    const joins = _.get(layer, 'joins', []);
    joins.forEach(join => {
      if (_.has(join, 'right.indexPatternRefName')) {
        const reference = findReference(join.right.indexPatternRefName, references);
        join.right.indexPatternId = reference.id;
        delete join.right.indexPatternRefName;
      }
    });
  });

  return {
    attributes: {
      ...attributes,
      layerListJSON: JSON.stringify(layerList),
    },
  };
}
