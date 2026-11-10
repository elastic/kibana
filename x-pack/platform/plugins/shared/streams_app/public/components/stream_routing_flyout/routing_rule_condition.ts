/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A rule's OTTL condition as written to its `when`, such as
 * `resource.attributes["env"] == "prod"`. A blank one leaves the rule without a
 * condition, so it matches all remaining data.
 */
export const normalizeWhen = (when: string | undefined): string | undefined => {
  const trimmed = when?.trim();
  return trimmed ? trimmed : undefined;
};
