/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the series identity subject for an alert episode.
 *
 * - Internal episodes (`source == 'internal'` or no source): subject = rule_id
 * - External episodes (any other source): subject = source (vendor name)
 */
export const episodeSubject = ({
  source,
  rule_id,
}: {
  source?: string | null;
  rule_id?: string | null;
}): string => (source == null || source === 'internal' ? rule_id! : source);
