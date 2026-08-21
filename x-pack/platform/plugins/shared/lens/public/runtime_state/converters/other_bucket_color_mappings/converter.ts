/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColorMapping } from '@kbn/coloring';
import {
  DEFAULT_OTHERS_BUCKET_ASSIGNMENT,
  getColorAssignmentMatcher,
  isOtherBucketAssignment,
} from '@kbn/coloring';
import { OTHER_BUCKET_VALUE } from '@kbn/coloring/src/shared_components/color_mapping/special_tokens';

/**
 * Migrates a color mapping config that stored the "__other__" bucket as a regular
 * assignment into the new representation that uses a dedicated `others_bucket` special assignment.
 * Returns the same reference when no migration is needed.
 */
export function convertToOtherBucketColorMappings(
  colorMapping: ColorMapping.Config
): ColorMapping.Config {
  const { assignments, specialAssignments } = colorMapping;
  const assignmentMatcher = getColorAssignmentMatcher(assignments);

  // if the other bucket is assigned, we need to remove it from the assignments and add a special assignment for it
  if (assignmentMatcher.hasMatch(OTHER_BUCKET_VALUE)) {
    const assignedColor = assignments[assignmentMatcher.getIndex(OTHER_BUCKET_VALUE)].color;

    if (assignedColor.type === 'gradient') {
      // we can't migrate gradient colors, so we don't add a special assignment for it, it will show as 'auto'
      return colorMapping;
    }

    return {
      ...colorMapping,
      assignments: assignments
        .map((assignment) => ({
          ...assignment,
          rules: assignment.rules.filter((rule) => {
            if (rule.type === 'raw') {
              return rule.value !== OTHER_BUCKET_VALUE;
            }
            if (rule.type === 'match') {
              return rule.pattern !== OTHER_BUCKET_VALUE;
            }
            return true;
          }),
        }))
        .filter((assignment) => assignment.rules.length > 0),
      specialAssignments: [
        ...specialAssignments.filter((assignment) => !isOtherBucketAssignment(assignment)),
        {
          ...DEFAULT_OTHERS_BUCKET_ASSIGNMENT,
          color: assignedColor,
        } satisfies ColorMapping.OtherBucketAssignment,
      ],
    };
  }

  return colorMapping;
}

export function hasDeprecatedOtherBucketAssignment(colorMapping?: ColorMapping.Config) {
  if (!colorMapping) return false;
  const assignmentMatcher = getColorAssignmentMatcher(colorMapping.assignments);
  return assignmentMatcher.hasMatch(OTHER_BUCKET_VALUE);
}
