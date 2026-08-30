/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import { DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME } from '../generation_guidance/design';
import type { DashboardGuidanceModule } from '../guidance_module';
import { PRETTIFY_RULES_REFERENCE_NAME, prettifyRulesReference } from './prettify_rules';

const guidance = `## Prettify

When the user asked to prettify this dashboard and an image is attached: look at the screenshot yourself. Come up with corrections from what you see. After reading \`${PRETTIFY_RULES_REFERENCE_NAME}\`, internally split required vs optional improvements. Apply the required ones now. Treat title-intent vs painted content as optional. If there is an optional improvement, ask one question about it and wait — do not apply it until the user agrees. Skip the question when there is nothing optional. Tell the user in plain language what will look different. Do not name Hard rule or Creative, and do not quote grid units, Lens fields, or tool operations.

Prefer modify and expand. Do not remove visualization panels. Call \`${dashboardTools.generateDashboard}\` once to apply. Then render the updated attachment. Apply \`${DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME}\` for composition and grid packing.

Without an image, this is a normal dashboard edit.`;

export const dashboardPrettify: DashboardGuidanceModule = {
  guidance,
  referencedContent: [prettifyRulesReference],
};

export { PRETTIFY_RULES_REFERENCE_NAME, prettifyRulesReference } from './prettify_rules';
