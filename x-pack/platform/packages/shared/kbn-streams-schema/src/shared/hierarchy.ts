/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isDescendantOf(parent: string, child: string) {
  const parentSegments = parent.split('.');
  const childSegments = child.split('.');
  return (
    parentSegments.length < childSegments.length &&
    parentSegments.every((segment, index) => segment === childSegments[index])
  );
}

export function isChildOf(parent: string, child: string) {
  return isDescendantOf(parent, child) && child.split('.').length === parent.split('.').length + 1;
}

export function getParentId(id: string) {
  const parts = id.split('.');
  if (parts.length === 1) {
    return undefined;
  }
  return parts.slice(0, parts.length - 1).join('.');
}

export function isRoot(id: string) {
  return id.split('.').length === 1;
}

export function getAncestors(id: string) {
  const parts = id.split('.');
  return parts.slice(0, parts.length - 1).map((_, index) => parts.slice(0, index + 1).join('.'));
}

export function getAncestorsAndSelf(id: string) {
  return getAncestors(id).concat(id);
}

export function getSegments(id: string) {
  return id.split('.');
}

export const MAX_NESTING_LEVEL = 5;
