/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Spike demo: each attachment adapter's `data → ViewSpec` output rendered to
 * GitHub markdown (and one to Slack Block Kit), proving the payload (not the
 * Kibana `render` fn) is the portable seam every attachment type can share. Run
 * with:
 *
 *   node --require ./src/setup_node_env \
 *     x-pack/platform/plugins/shared/adaptive_ui/scripts/cross_surface_demo.ts
 */

import { ToolingLog } from '@kbn/tooling-log';
import { renderSlack, renderMarkdown, validateView } from '@kbn/adaptive-ui';
import { adapterGallery } from '@kbn/adaptive-ui-adapters';

const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

log.info(`${adapterGallery.length} attachment adapters -> one portable ViewSpec each\n`);

for (const { attachmentType, degraded, spec } of adapterGallery) {
  const result = validateView(spec);
  const suffix = degraded ? ' (degraded render — see primitive gaps doc)' : '';
  log.info(
    `== ${attachmentType}${suffix} — validateView: ${result.valid ? 'valid' : 'INVALID'} ==`
  );
  log.info(renderMarkdown(spec));
  log.info('');
}

// Show one full Slack Block Kit payload so the off-Kibana surface is visible too.
const [first] = adapterGallery;
log.info(`== ${first.attachmentType} -> Slack Block Kit (blocks) ==`);
log.info(JSON.stringify(renderSlack(first.spec).blocks, null, 2));
log.info('\n== Kibana ==');
log.info(
  'Kibana renders the same payloads via the registered "view" renderer (render() -> ReactNode).'
);
