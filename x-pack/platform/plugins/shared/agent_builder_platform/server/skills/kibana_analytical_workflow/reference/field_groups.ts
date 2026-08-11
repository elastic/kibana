/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';

export const fieldGroupsReference: ReferencedContent = {
  relativePath: './reference',
  name: 'field_groups',
  content: `# Field Grouping Heuristics

This is a pattern-matching reference only — it does not list fields that necessarily exist in any
given index. Always confirm a field against the actual index mapping (via
\`${platformCoreTools.getIndexMapping}\`) before categorizing it; never assume a field exists just
because it matches a pattern here or appears in an example.

Use these heuristics to sort a data view/index's REAL mapped fields into semantic groups. A field
can only belong to one group; when a field could match multiple groups, prefer the more specific
one (e.g. \`user.id\` is User identity, not Unclassified). Real fields that match nothing below go
into Unclassified — don't force a fit.

| Group | Match on name/type patterns | Typical purpose |
| --- | --- | --- |
| Time | \`@timestamp\`, \`*.timestamp\`, \`*_at\`, \`*_time\`, \`date\`/\`date_nanos\` type | When something happened |
| Event metadata | \`event.*\`, \`*.type\`, \`*.action\`, \`*.category\`, \`*.outcome\`, \`message\` | What kind of event this is |
| Performance | \`duration\`, \`*.duration\`, \`latency\`, \`*_ms\`, \`*.took\`, numeric timing fields | How fast/slow something was |
| User identity | \`user.*\`, \`*.author\`, \`*.owner\`, \`*.email\`, \`*.username\` | Who did it |
| Navigation | \`url.*\`, \`*.path\`, \`*.route\`, \`referrer\`, \`*.page\` | Where in the product/site |
| Environment | \`labels.*\`, \`tags\`, \`*.environment\`, \`deployment.*\` | Deployment/runtime context |
| Infrastructure | \`host.*\`, \`container.*\`, \`kubernetes.*\`, \`node.*\`, \`agent.*\` | What ran it |
| License | \`license.*\`, \`*.tier\`, \`*.subscription\` | Entitlement context |
| Cloud | \`cloud.*\` (provider, region, account) | Cloud placement |
| Product | \`*.version\`, \`kibana.*\`, \`elasticsearch.*\`, product-specific namespaces | Product/feature context |
| Client/browser | \`user_agent.*\`, \`client.*\`, \`browser.*\` | What client made the request |
| Health | \`*.status\`, \`*.state\`, \`error.*\`, \`*.success\` (boolean/keyword) | Success/failure/health signal |
| Flags | boolean fields not already claimed by Health (e.g. feature flags) | On/off configuration |
| Unclassified | everything else | Present but not semantically grouped |

Present the table to the user with columns: Group, Fields, Type, Description, using only fields
confirmed present in the mapping response. Keep field lists concise (name only, not full mapping)
— the goal is a fast orientation, not an exhaustive dump.`,
};
