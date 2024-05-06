/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { Groupings } from '../../domain/models';

/**
 * Takes a list of groupBy fields and the nested groupings object provided from
 * ES search results and returns a flatted object with the `groupBy` fields as keys
 * @param groupBy an array of groupBy fields
 * @param groupings a nested object of groupings
 * @returns a flattened object of groupings
 */

export const getFlattenedGroupings = ({
  groupBy,
  groupings,
}: {
  groupBy: string[] | string;
  groupings: Record<string, unknown>;
}): Groupings => {
  const groupByFields = groupBy ? [groupBy].flat() : [];
  const hasGroupings = Object.keys(groupings || []).length;
  const formattedGroupings = hasGroupings
    ? groupByFields.reduce<Groupings>((acc, group) => {
        acc[group] = `${get(groupings, group)}`;
        return acc;
      }, {})
    : {};
  return formattedGroupings;
};
