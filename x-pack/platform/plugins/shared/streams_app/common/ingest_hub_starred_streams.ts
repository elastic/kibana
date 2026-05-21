/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { distinctUntilChanged, filter, fromEvent, merge, of, type Observable } from 'rxjs';
import { map } from 'rxjs';

/** Session storage for stream names starred from the All streams table (ingest hub demo). */
export const STREAMS_STARRED_STORAGE_KEY = 'streams:starredStreamNames';

export const STREAMS_STARRED_CHANGE_EVENT = 'streams:starredStreamNamesChange';

function parseStoredNames(raw: string | null): readonly string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

export function readStarredStreamNames(): readonly string[] {
  try {
    return parseStoredNames(
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(STREAMS_STARRED_STORAGE_KEY)
        : null
    );
  } catch {
    return [];
  }
}

function areStarredListsEqual(previous: readonly string[], next: readonly string[]): boolean {
  return previous.length === next.length && previous.every((name, index) => name === next[index]);
}

export function isStreamStarred(name: string): boolean {
  return readStarredStreamNames().includes(name);
}

export function toggleStarredStreamName(name: string): void {
  const current = [...readStarredStreamNames()];
  const index = current.indexOf(name);
  if (index >= 0) {
    current.splice(index, 1);
  } else {
    current.push(name);
  }
  try {
    sessionStorage.setItem(STREAMS_STARRED_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // sessionStorage may be unavailable in tests
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STREAMS_STARRED_CHANGE_EVENT));
  }
}

/** Stable deep link id for a starred stream (app `streams`, id `starred-*`). */
export function toStarredStreamDeepLinkId(streamName: string): string {
  return `starred-${streamName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export function toStarredStreamNavDeepLinkId(streamName: string): `streams:${string}` {
  return `streams:${toStarredStreamDeepLinkId(streamName)}`;
}

/**
 * Observable of starred stream names. Always reads session storage when emitting so
 * consumers in other plugins stay in sync with the streams app table.
 */
export function getStarredStreams$(): Observable<readonly string[]> {
  const read = () => readStarredStreamNames();

  if (typeof window === 'undefined') {
    return of(read());
  }

  return merge(
    of(read()),
    fromEvent(window, STREAMS_STARRED_CHANGE_EVENT).pipe(map(read)),
    fromEvent<StorageEvent>(window, 'storage').pipe(
      filter((event) => event.key === STREAMS_STARRED_STORAGE_KEY || event.key === null),
      map(() => read())
    )
  ).pipe(distinctUntilChanged(areStarredListsEqual));
}

export function useStarredStreamNames(): readonly string[] {
  const [names, setNames] = useState<readonly string[]>(readStarredStreamNames);

  useEffect(() => {
    const subscription = getStarredStreams$().subscribe(setNames);
    return () => subscription.unsubscribe();
  }, []);

  return names;
}

export function useToggleStarredStreamName(): (name: string) => void {
  return useCallback((name: string) => {
    toggleStarredStreamName(name);
  }, []);
}
