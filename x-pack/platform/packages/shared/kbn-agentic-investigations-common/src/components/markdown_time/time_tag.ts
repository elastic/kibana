/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

/**
 * A complete `<time ...>` tag: self-closed, or open with optional inner text and a close.
 * Capture group 1 is the inner text. Compile with the `i` flag (and `g` to scan).
 */
export const COMPLETE_TIME_TAG = '<time(?=[\\s/>])[^>]*?(?:\\/>|>([^<]*)<\\/time\\s*>)';

const DATETIME_ATTRIBUTE = /\sdatetime\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/i;

/** The value of the `datetime` attribute of an opening tag, if it has one. */
export const getTimeTagDatetime = (openTag: string): string | undefined => {
  const [, doubleQuoted, singleQuoted] = DATETIME_ATTRIBUTE.exec(openTag) ?? [];
  return doubleQuoted ?? singleQuoted;
};

/** The moment for an ISO 8601 value that carries a time zone, or undefined for anything else. */
export const parseTimeTagDatetime = (value: string | undefined): moment.Moment | undefined => {
  if (!value || !ISO_WITH_ZONE.test(value)) return undefined;
  const parsed = moment(value, moment.ISO_8601, true);
  return parsed.isValid() ? parsed : undefined;
};
