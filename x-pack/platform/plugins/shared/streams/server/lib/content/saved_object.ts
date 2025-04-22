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
  ContentPackSavedObjectLinks,
  INDEX_PLACEHOLDER,
  findConfiguration,
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
      const { patterns } = findConfiguration(object);
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
  links,
}: {
  savedObjects: ContentPackSavedObject[];
  include: ContentPackIncludedObjects;
  target: string;
  links: ContentPackSavedObjectLinks;
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
    const { patterns } = findConfiguration(object);
    const replacements = patterns
      .filter((pattern) => pattern.startsWith(INDEX_PLACEHOLDER))
      .reduce((acc, pattern) => {
        acc[pattern] = pattern.replace(INDEX_PLACEHOLDER, target);
        return acc;
      }, {} as Record<string, string>);

    return replaceIndexPatterns(object, replacements);
  });

  return updateIds(uniqObjects, links);
}

export function updateIds(
  savedObjects: ContentPackSavedObject[],
  links: ContentPackSavedObjectLinks
) {
  const existingLinks = links.dashboards.flatMap((ref) => [ref, ...ref.references]);
  const targetId = (sourceId: string) => {
    const link = existingLinks.find(({ source_id: id }) => id === sourceId);
    if (!link) {
      throw new Error(`link for [${sourceId}] was not generated`);
    }
    return link.target_id;
  };

  savedObjects.forEach((object) => {
    object.id = targetId(object.id);
    object.references.forEach((ref) => {
      // only update the id if the reference is included in the content pack.
      // a missing reference is not necessarily an error condition since it could
      // point to a pre existing saved object, for example logs-* and metrics-*
      // data views
      if (savedObjects.find((so) => so.id === ref.id)) {
        ref.id = targetId(ref.id);
      }
    });
  });

  return savedObjects;
}

// when we import a saved object into a stream we create a copy of the source
// object with a new identifier. a saved object link stores the source identifier
// of an imported object which allows overwriting already imported objects when
// (re)importing a content pack
export function savedObjectLinks(
  savedObjects: ContentPackSavedObject[],
  existingLinks: ContentPackSavedObjectLinks
): ContentPackSavedObjectLinks {
  const dashboards = savedObjects
    .filter((object) => object.type === 'dashboard')
    .map((object) => {
      const existingLink = existingLinks.dashboards.find(({ source_id: id }) => id === object.id);

      return {
        source_id: object.id,
        target_id: existingLink?.target_id ?? v4(),
        references: object.references.map((ref) => ({
          source_id: ref.id,
          target_id:
            existingLink?.references.find((existingRef) => ref.id === existingRef.source_id)
              ?.target_id ?? v4(),
        })),
      };
    });

  return { dashboards };
}

export function referenceManagedIndexPattern(savedObjects: ContentPackSavedObject[]) {
  return savedObjects.some((object) =>
    object.references.some(
      (ref) => ref.type === 'index-pattern' && (ref.id === 'metrics-*' || ref.id === 'logs-*')
    )
  );
}
