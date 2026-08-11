/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SSEEvent {
  event?: string;
  data: unknown;
}

/**
 * Parse raw SSE text into structured events.
 * SSE events are separated by blank lines (\n\n). Each event block may contain
 * an `event:` line (the event type) and a `data:` line (the JSON payload).
 */
export const parseSSEEvents = (text: string): SSEEvent[] => {
  const events: SSEEvent[] = [];

  for (const block of text.split(/\n\n/)) {
    const lines = block.split('\n').map((line) => line.trim());
    const eventLine = lines.find((line) => line.startsWith('event: '));
    const dataLine = lines.find((line) => line.startsWith('data: '));

    if (!dataLine) continue;

    try {
      events.push({
        event: eventLine?.slice(7).trim(),
        data: JSON.parse(dataLine.slice(6)),
      });
    } catch {
      // skip malformed blocks
    }
  }

  return events;
};

/**
 * Find the data payload for a specific SSE event type.
 * Returns null if no matching event is found or if an error event precedes it.
 */
export const findSSEEventData = <T = unknown>(text: string, eventType: string): T | null => {
  const events = parseSSEEvents(text);

  for (const event of events) {
    const data = event.data as Record<string, unknown>;
    if (data.type === 'error') {
      // eslint-disable-next-line no-console
      console.error('SSE error event:', data.message || data.error);
      return null;
    }
  }

  const match = events.find((e) => e.event === eventType);
  if (!match) {
    // eslint-disable-next-line no-console
    console.error(`No SSE event of type '${eventType}' found`);
    return null;
  }

  return match.data as T;
};

export const formatPercent = (n: number): string => `${(n * 100).toFixed(0)}%`;
