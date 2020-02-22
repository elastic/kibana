/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Either, left, fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { requiredRulesSchema, RequiredRulesSchema, partialRulesSchema } from './base_rules_schema';
import { typeAndTimelineOnlySchema, TypeAndTimelineOnly } from './type_timeline_only_schema';

export const timelineTitle = t.exact(
  t.type({ timeline_title: partialRulesSchema.props.timeline_title })
);

export const timelineId = t.exact(t.type({ timeline_id: partialRulesSchema.props.timeline_id }));

export const addSavedId = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.type === 'saved_query') {
    return [t.exact(t.type({ saved_id: partialRulesSchema.props.saved_id }))];
  } else {
    return [];
  }
};

export const addTimelineTitle = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed[] => {
  if (typeAndTimelineOnly.timeline_id != null) {
    return [
      t.exact(t.type({ timeline_title: partialRulesSchema.props.timeline_title })),
      t.exact(t.type({ timeline_id: partialRulesSchema.props.timeline_id })),
    ];
  } else {
    return [];
  }
};

export const getDependents = (typeAndTimelineOnly: TypeAndTimelineOnly): t.Mixed => {
  const dependents: t.Mixed[] = [
    t.exact(requiredRulesSchema),
    ...addSavedId(typeAndTimelineOnly),
    ...addTimelineTitle(typeAndTimelineOnly),
  ];

  if (dependents.length > 1) {
    // This unsafe cast is because t.intersection does not use an array but rather a set of
    // tuples and really does not look like they expected us to ever dynamically build up
    // intersections, but here we are doing that. If you go above 4 elements this might crash
    // or it will be unexpected behavior as it only handles 4 things at a time. Your best bet
    // after 4 is to call it multiple times in chunks.
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
