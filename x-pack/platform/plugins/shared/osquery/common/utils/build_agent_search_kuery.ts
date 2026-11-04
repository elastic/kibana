/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery, escapeQuotes } from '@kbn/es-query';

/**
 * Builds the Kuery string for searching agents.
 * Searches across host.name (as displayed in Security alerts) and host.hostname
 * (as displayed on Fleet agents), along with agent id, policy id, platform, and policy name.
 * Generates targeted case variations and phrase matching to ensure case-insensitive matching
 * across keyword and analyzed fields without redundant scans.
 */
export const buildAgentSearchKuery = (searchValue: string): string => {
  if (!searchValue) {
    return '';
  }

  const escapedSearch = escapeKuery(searchValue);

  const hostKeywordClauses = [...new Set([searchValue, searchValue.toUpperCase()])].map(
    (value) => `local_metadata.host.hostname.keyword:*${escapeKuery(value)}*`
  );

  const queryParts = [
    ...hostKeywordClauses,
    `local_metadata.host.name.keyword:*${escapeKuery(searchValue.toLowerCase())}*`,
    `local_metadata.host.hostname:*${escapedSearch}*`,
    `local_metadata.host.hostname:"${escapeQuotes(searchValue)}"`,
    `local_metadata.elastic.agent.id:*${escapedSearch}*`,
    `policy_id: *${escapedSearch}*`,
    `local_metadata.os.platform: *${escapedSearch}*`,
    `policy_name:${escapedSearch}`,
  ];

  return queryParts.join(' or ');
};
