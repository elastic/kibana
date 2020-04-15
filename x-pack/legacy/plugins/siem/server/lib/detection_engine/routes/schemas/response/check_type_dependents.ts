/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either, left, fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { isMlRule } from '../../../../../../common/detection_engine/ml_helpers';
import {
  dependentRulesSchema,
  RequiredRulesSchema,
  partialRulesSchema,
  requiredRulesSchema,
} from './rules_schema';
import { typeAndTimelineOnlySchema, TypeAndTimelineOnly } from './type_timeline_only_schema';

export const addSavedId = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.type === 'saved_query') {
    return [t.exact(t.type({ saved_id: dependentRulesSchema.props.saved_id }))];
  } else {
    return [];
  }
};

export const addTimelineTitle = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.timeline_id != null) {
    return [
      t.exact(t.type({ timeline_title: dependentRulesSchema.props.timeline_title })),
      t.exact(t.type({ timeline_id: dependentRulesSchema.props.timeline_id })),
    ];
  } else {
    return [];
  }
};

export const addQueryFields = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.type === 'query' || typeAndTimelineOnly.type === 'saved_query') {
    return [
      t.exact(t.type({ query: dependentRulesSchema.props.query })),
      t.exact(t.type({ language: dependentRulesSchema.props.language })),
    ];
  } else {
    return [];
  }
};

export const addMlFields = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (isMlRule(typeAndTimelineOnly.type)) {
    return [
      t.exact(t.type({ anomaly_threshold: dependentRulesSchema.props.anomaly_threshold })),
      t.exact(
        t.type({ machine_learning_job_id: dependentRulesSchema.props.machine_learning_job_id })
      ),
    ];
  } else {
    return [];
  }
};

export const getDependents = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed => {
  const dependents: t.Mixed[] = [
    t.exact(requiredRulesSchema),
    t.exact(partialRulesSchema),
    ...addSavedId(typeAndTimelineOnly),
    ...addTimelineTitle(typeAndTimelineOnly),
    ...addQueryFields(typeAndTimelineOnly),
    ...addMlFields(typeAndTimelineOnly),
  ];

  if (dependents.length > 1) {
    // This unsafe cast is because t.intersection does not use an array but rather a set of
    // tuples and really does not look like they expected us to ever dynamically build up
    // intersections, but here we are doing that. Looking at their code, although they limit
    // the array elements to 5, it looks like you have N number of intersections
    const unsafeCast: [t.Mixed, t.Mixed] = dependents as [t.Mixed, t.Mixed];
    return t.intersection(unsafeCast);
  } else {
    // We are not allowed to call t.intersection with a single value so we return without
    // it here normally.
    return dependents[0];
  }
};

export const checkTypeDependents = (input: unknown): Either<t.Errors, RequiredRulesSchema> => {
  const typeOnlyDecoded = typeAndTimelineOnlySchema.decode(input);
  const onLeft = (errors: t.Errors): Either<t.Errors, RequiredRulesSchema> => left(errors);
  const onRight = (
    typeAndTimelineOnly: TypeAndTimelineOnly
  ): Either<t.Errors, RequiredRulesSchema> => {
    const intersections = getDependents(typeAndTimelineOnly);
    return intersections.decode(input);
  };
  return pipe(typeOnlyDecoded, fold(onLeft, onRight));
};
