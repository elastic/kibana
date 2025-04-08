/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import {
  ContentPackIncludedObjects,
  ContentPackSavedObject,
  INDEX_PLACEHOLDER,
  findIndexPatterns,
  isIncludeAll,
  replaceIndexPatterns,
} from '@kbn/content-packs-schema';
import { compact, uniqBy } from 'lodash';

export function prepareForExport({
  savedObjects,
  source,
  replacedPatterns = [],
}: {
  savedObjects: ContentPackSavedObject[];
  source: string;
  replacedPatterns?: string[];
}) {
  return savedObjects.map((object) => {
    if (object.type === 'dashboard' || object.type === 'index-pattern') {
      const patterns = findIndexPatterns(object);
      const replacements = {
        ...replacedPatterns.reduce((acc, pattern) => {
          acc[pattern] = INDEX_PLACEHOLDER;
          return acc;
        }, {} as Record<string, string>),

        ...patterns
          .filter((pattern) => pattern.startsWith(source))
          .reduce((acc, pattern) => {
            acc[pattern] = pattern.replace(source, INDEX_PLACEHOLDER);
            return acc;
          }, {} as Record<string, string>),
      };

      return replaceIndexPatterns(object, replacements);
    }
    return object;
  });
}

export function prepareForImport({
  savedObjects,
  include,
  target,
}: {
  savedObjects: ContentPackSavedObject[];
  include: ContentPackIncludedObjects;
  target: string;
}) {
  const uniqObjects = uniqBy(
    savedObjects
      .filter(
        (object) =>
          object.type === 'dashboard' &&
          (isIncludeAll(include) || include.objects.dashboards.includes(object.id))
      )
      .flatMap((object) => [
        object,
        ...compact(
          object.references.map((ref) =>
            savedObjects.find(({ id, type }) => id === ref.id && type === ref.type)
          )
        ),
      ]),
    ({ id }) => id
  ).map((object) => {
    const patterns = findIndexPatterns(object);
    const replacements = patterns
      .filter((pattern) => pattern.startsWith(INDEX_PLACEHOLDER))
      .reduce((acc, pattern) => {
        acc[pattern] = pattern.replace(INDEX_PLACEHOLDER, target);
        return acc;
      }, {} as Record<string, string>);

    return replaceIndexPatterns(object, replacements);
  });

  return replaceReferences(uniqObjects);
}

export function replaceReferences(savedObjects: ContentPackSavedObject[]) {
  const idReplacements = savedObjects.reduce((acc, object) => {
    acc[object.id] = v4();
    return acc;
  }, {} as Record<string, string>);

  savedObjects.forEach((object) => {
    object.id = idReplacements[object.id];
    object.references.forEach((ref) => {
      ref.id = idReplacements[ref.id];
    });
  });

  return savedObjects;
}
