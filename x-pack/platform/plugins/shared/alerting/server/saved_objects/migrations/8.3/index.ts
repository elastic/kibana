/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { omit } from 'lodash';
import moment from 'moment-timezone';
import { RawRule } from '../../../types';
import {
  createEsoMigration,
  isDetectionEngineAADRuleType,
  isEsQueryRuleType,
  pipeMigrations,
} from '../utils';

function addSearchType(doc: SavedObjectUnsanitizedDoc<RawRule>) {
  const searchType = doc.attributes.params.searchType;

  return isEsQueryRuleType(doc) && !searchType
    ? {
        ...doc,
        attributes: {
          ...doc.attributes,
          params: {
            ...doc.attributes.params,
            searchType: 'esQuery',
          },
        },
      }
    : doc;
}

/**
 * removes internal tags(starts with '__internal') from Security Solution rules
 * @param doc rule to be migrated
 * @returns migrated rule if it's Security Solution rule or unchanged if not
 */
function removeInternalTags(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  if (!isDetectionEngineAADRuleType(doc)) {
    return doc;
  }

  const {
    attributes: { tags },
  } = doc;

  const filteredTags = (tags ?? []).filter((tag) => !tag.startsWith('__internal_'));

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      tags: filteredTags,
    },
  };
}

interface ConvertSnoozes extends RawRule {
  snoozeEndTime?: string;
}

function convertSnoozes(
  doc: SavedObjectUnsanitizedDoc<ConvertSnoozes>
): SavedObjectUnsanitizedDoc<RawRule> {
  const {
    attributes: { snoozeEndTime },
  } = doc;

  return {
    ...doc,
    attributes: {
      ...(omit(doc.attributes, ['snoozeEndTime']) as RawRule),
      snoozeSchedule: snoozeEndTime
        ? [
            {
              duration: Date.parse(snoozeEndTime as string) - Date.now(),
              rRule: {
                dtstart: new Date().toISOString(),
                tzid: moment.tz.guess(),
                count: 1,
              },
            },
          ]
        : [],
    },
  };
}

export const getMigrations830 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(addSearchType, removeInternalTags, convertSnoozes)
  );
