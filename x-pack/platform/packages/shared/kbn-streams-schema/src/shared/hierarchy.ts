/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const LOGS_ROOT_STREAM_NAME = 'logs';
export const LOGS_OTEL_STREAM_NAME = 'logs.otel' as const;
export const LOGS_ECS_STREAM_NAME = 'logs.ecs' as const;

export const ROOT_STREAM_NAMES = [
  LOGS_ROOT_STREAM_NAME,
  LOGS_OTEL_STREAM_NAME,
  LOGS_ECS_STREAM_NAME,
] as const;

export type RootStreamName = (typeof ROOT_STREAM_NAMES)[number];

const SORTED_ROOT_STREAM_NAMES: readonly RootStreamName[] = [...ROOT_STREAM_NAMES].sort(
  (a, b) => b.length - a.length
);

/**
 * Returns the matched root, or undefined if no match.
 * Checks longest roots first to prevent false matches (e.g., "logs.otel" before "logs").
 */
function matchesAnyRoot(streamName: string): RootStreamName | undefined {
  for (const root of SORTED_ROOT_STREAM_NAMES) {
    if (streamName === root || streamName.startsWith(`${root}.`)) {
      return root;
    }
  }
  return undefined;
}

export function isDescendantOf(parent: string, child: string) {
  // If child is a root stream, it cannot be a descendant of anything
  if (ROOT_STREAM_NAMES.includes(child as RootStreamName)) {
    return false;
  }

  // Both parent and child must belong to the same root stream
  // This prevents logs.ecs.child from being considered a descendant of logs
  if (getRoot(parent) !== getRoot(child)) {
    return false;
  }

  return child.startsWith(`${parent}.`);
}

export function isChildOf(parent: string, child: string) {
  // If child is a root stream, it cannot be a child of anything
  if (ROOT_STREAM_NAMES.includes(child as RootStreamName)) {
    return false;
  }

  return isDescendantOf(parent, child) && child.split('.').length === parent.split('.').length + 1;
}

/**
 * Check if parent is the direct parent of descendant.
 * This is the inverse of isChildOf - checks from parent's perspective.
 *
 * Examples:
 *   - isParentName("logs.otel", "logs.otel.nginx") → true
 *   - isParentName("logs.otel", "logs.otel.nginx.access") → false (grandparent)
 *   - isParentName("logs", "logs.otel") → false (logs.otel is a root)
 */
export function isParentName(parent: string, descendant: string) {
  // If descendant is a root stream, it cannot be a child of anything
  if (ROOT_STREAM_NAMES.includes(descendant as RootStreamName)) {
    return false;
  }

  // Use getParentId to find the actual parent, accounting for multi-segment roots
  const actualParent = getParentId(descendant);
  return actualParent === parent;
}

/**
 * Get parent stream ID. Returns undefined for root streams.
 *
 * Examples:
 *   - getParentId("logs.otel") → undefined (root)
 *   - getParentId("logs.otel.nginx") → "logs.otel"
 *   - getParentId("logs.otel.nginx.access") → "logs.otel.nginx"
 */
export function getParentId(id: string): string | undefined {
  // Check if this is a root stream
  if (ROOT_STREAM_NAMES.includes(id as RootStreamName)) {
    return undefined;
  }

  const parts = id.split('.');
  if (parts.length === 1) {
    return undefined;
  }

  for (let i = parts.length - 1; i > 0; i--) {
    const potentialParent = parts.slice(0, i).join('.');

    // If this potential parent is a known root, return it
    if (ROOT_STREAM_NAMES.includes(potentialParent as RootStreamName)) {
      return potentialParent;
    }

    // If this potential parent matches any root hierarchy, it could be a valid parent
    if (matchesAnyRoot(potentialParent)) {
      return potentialParent;
    }
  }

  // Fallback: return first segment for unknown hierarchies
  return parts[0];
}

export function isRoot(id: string): boolean {
  const segmentCount = id.split('.').length;

  // Single segment is always a root (e.g., "logs", "metrics", "traces")
  if (segmentCount === 1) {
    return true;
  }

  // Two segments is a root only if it's a known multi-segment root
  if (segmentCount === 2) {
    return ROOT_STREAM_NAMES.includes(id as RootStreamName);
  }

  // More than 2 segments is never a root
  return false;
}

export function getRoot(id: string): string {
  const matchedRoot = matchesAnyRoot(id);
  if (matchedRoot) {
    return matchedRoot;
  }
  // Fallback to first segment for unknown roots
  return id.split('.')[0];
}

export function getAncestors(id: string): string[] {
  // If this is a root, it has no ancestors
  if (isRoot(id)) {
    return [];
  }

  const ancestors: string[] = [];
  let current = id;

  // Walk up the parent chain
  while (true) {
    const parent = getParentId(current);
    if (!parent) break;
    ancestors.unshift(parent); // Add at beginning to maintain root-to-parent order
    current = parent;
  }

  return ancestors;
}

export function getAncestorsAndSelf(id: string): string[] {
  return getAncestors(id).concat(id);
}

export function getSegments(id: string): string[] {
  // First check if this is a known root stream
  const matchedRoot = matchesAnyRoot(id);
  if (!matchedRoot) {
    // Unknown stream type, fall back to simple split
    return id.split('.');
  }

  // If this IS the root, return it as a single segment
  if (id === matchedRoot) {
    return [id];
  }

  // Otherwise, return root + segments after root
  const afterRoot = id.slice(matchedRoot.length + 1); // +1 for the dot
  return [matchedRoot, ...afterRoot.split('.')];
}

export const MAX_NESTING_LEVEL = 5;
