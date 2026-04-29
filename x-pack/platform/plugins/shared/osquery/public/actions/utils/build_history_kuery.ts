/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const escapeKuery = (value: string): string => value.replace(/[\\"/():<>*{}[\]]/g, '\\$&');

export const buildHistoryKuery = ({
  searchTerm,
  selectedUserIds,
}: {
  searchTerm: string;
  selectedUserIds: string[];
}): string | undefined => {
  const parts: string[] = [];

  if (searchTerm.trim()) {
    const escaped = escapeKuery(searchTerm.trim());
    parts.push(
      `(action_id: ${escaped}* OR queries.query: ${escaped}* OR pack_name: ${escaped}* OR agent_ids: ${escaped}*)`
    );
  }

  if (selectedUserIds.length > 0) {
    const userClauses = selectedUserIds
      .map((userId) => `user_id: "${escapeKuery(userId)}"`)
      .join(' OR ');
    parts.push(`(${userClauses})`);
  }

  if (parts.length === 0) return undefined;

  return parts.join(' AND ');
};
