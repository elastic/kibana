/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CREATE_FROM_TEMPLATE_PATH_REGEX = /\/create\/template\/([^/?#]+)/;

/**
 * Parses the template id out of a rule creation pathname, e.g.
 * `/app/management/insightsAndAlerting/triggersActions/create/template/my-template-id` ->
 * `my-template-id`. Returns `undefined` when the rule wasn't created from a template.
 */
export function getTemplateIdFromPathname(pathname: string): string | undefined {
  const match = pathname.match(CREATE_FROM_TEMPLATE_PATH_REGEX);
  if (!match) {
    return undefined;
  }
  return decodeURIComponent(match[1]);
}
