/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { failure } from 'io-ts/lib/PathReporter';
import { TimelineSavedObjectRuntimeType, TimelineSavedObject } from './types';

export const convertSavedObjectToSavedTimeline = (savedObject: unknown): TimelineSavedObject => {
  return TimelineSavedObjectRuntimeType.decode(savedObject)
    .map(savedTimeline => ({
      savedObjectId: savedTimeline.id,
      version: savedTimeline.version,
      ...savedTimeline.attributes,
    }))
    .getOrElseL(errors => {
      throw new Error(failure(errors).join('\n'));
    });
};
