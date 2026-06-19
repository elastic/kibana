/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Home for markdown panel logic.
 *
 * Markdown is authored as a `panelConfig` (`type: 'markdown'`) whose `config` is
 * passed through to the embeddable unchanged, exactly like a Lens `panelConfig`,
 * so there is no markdown-specific converter today. This module owns the markdown
 * embeddable-type identity and is the place for future markdown-specific behavior
 * (e.g. a markdown generation prompt that authors the content from a request).
 */
export { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
