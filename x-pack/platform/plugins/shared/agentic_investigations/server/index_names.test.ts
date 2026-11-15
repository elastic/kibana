/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hypothesesStorageSettings } from './hypotheses/storage/hypotheses_storage';
import { impactStorageSettings } from './impact/storage/impact_storage';
import {
  subjectClaimStorageSettings,
  subjectStorageSettings,
} from './subjects/storage/subject_storage';

const storageNames = [
  impactStorageSettings.name,
  subjectStorageSettings.name,
  subjectClaimStorageSettings.name,
  hypothesesStorageSettings.name,
];

describe('agentic investigations index names', () => {
  it('are unique and start with .kibana-', () => {
    expect(new Set(storageNames).size).toBe(storageNames.length);
    for (const name of storageNames) {
      expect(name.startsWith('.kibana-')).toBe(true);
    }
  });

  // The storage adapter's index template matches `<name>-*`. If one name were another's
  // followed by `-`, both same-priority templates would match the longer one's indices, and
  // Elasticsearch would refuse to create the second template.
  it('do not overlap in their index template patterns', () => {
    for (const name of storageNames) {
      for (const other of storageNames) {
        if (name !== other) {
          expect({ pattern: `${name}-*`, other, overlaps: other.startsWith(`${name}-`) }).toEqual({
            pattern: `${name}-*`,
            other,
            overlaps: false,
          });
        }
      }
    }
  });
});
