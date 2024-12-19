/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `type`+`id` tuple of a saved object
 */
export interface ObjectReference {
  type: string;
  id: string;
}

/**
 * Represent an assignable saved object, as returned by the `_find_assignable_objects` API
 */
export interface AssignableObject extends ObjectReference {
  icon?: string;
  title: string;
  tags: string[];
}

export interface UpdateTagAssignmentsOptions {
  tags: string[];
  assign: ObjectReference[];
  unassign: ObjectReference[];
  refresh?: boolean | 'wait_for';
}

export interface FindAssignableObjectsOptions {
  search?: string;
  maxResults?: number;
  types?: string[];
}

/**
 * Return a string that can be used as an unique identifier for given saved object
 */
export const getKey = ({ id, type }: ObjectReference) => `${type}|${id}`;
