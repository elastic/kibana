/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineCapability, type CapabilityNodeOf } from '@kbn/custom-app-registry';
import { MAX_HEADING_LENGTH } from '@kbn/custom-app-common';
import { linkTargetSchema } from '@kbn/custom-app-common';

export const linkCapability = defineCapability({
  kind: 'component',
  id: 'link',
  version: 1,
  props: lazySchema(() =>
    z.object({
      label: z
        .string()
        .min(1)
        .max(MAX_HEADING_LENGTH)
        .describe('The words of the link. It may use {{state.key}}.'),
      to: linkTargetSchema.describe(
        'Where it goes, always inside Kibana: Discover with the query of a component, a page of a Kibana application, or another custom app.'
      ),
    })
  ),
  doc: {
    summary:
      'A link to another page of Kibana, shown as a link people can also open in a new tab. "to" is { "type": "discover", "from": "<id of a table, stat or key_value that has a query>" } to open that query in Discover, with the current period and the current values written into it; { "type": "app", "app": "<application id>", "path"?: "<path inside it>" } for a page of an application, where the path may hold {{state.key}}, which is written safely as one part of the path; or { "type": "custom_app", "id": "<id of a saved custom app>" }. A link stays inside Kibana and cannot go to another site. Use the application ids and paths you know: "dashboards" with path "#/view/<dashboard id>", "discover", and the apps you were shown; if you are not sure of an application id or path, do not guess it, and use a link to Discover or to another custom app, or say what is missing. A link to a case or an alert needs the application and path of the solution the person uses, which you only know if they told you or you saw it.',
    whenToUse: 'To take people somewhere else. To run something use button.',
    example: {
      type: 'link',
      id: 'discover',
      label: 'Open in Discover',
      to: { type: 'discover', from: 'errors' },
    },
  },
  interpolated: ['label'],
  extraText: (node) =>
    node.to.type === 'app' && node.to.path !== undefined
      ? [{ prop: 'path', text: node.to.path }]
      : [],
  validate: (node, { sourceOf, nodes, issue }) => {
    if (node.to.type !== 'discover') return;
    const { from } = node.to;
    if (!nodes.some(({ id }) => id === from)) {
      issue(`Node "${node.id}" opens "${from}" in Discover, which is not a component`);
    } else if (sourceOf(from)?.type !== 'esql') {
      issue(`Node "${node.id}" opens "${from}" in Discover, which has no ES|QL query to open`);
    }
  },
  compact: true,
});

declare module '@kbn/custom-app-registry' {
  interface NodeTypeMap {
    link: CapabilityNodeOf<typeof linkCapability>;
  }
}
