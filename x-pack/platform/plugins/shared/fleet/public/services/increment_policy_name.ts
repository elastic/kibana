/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function incrementPolicyName(
  policies: Array<{ name: string }>,
  isFleetServerPolicy?: boolean
): string {
  const indices = policies
    .map((pol: { name: string }) => pol.name)
    .map((name) => {
      const match = name.match(
        isFleetServerPolicy ? /Fleet Server policy (\d+)/ : /Agent policy (\d+)/
      );
      return match ? parseInt(match[1], 10) : 0;
    });
  return `${isFleetServerPolicy ? 'Fleet Server' : 'Agent'} policy ${Math.max(...indices, 0) + 1}`;
}
