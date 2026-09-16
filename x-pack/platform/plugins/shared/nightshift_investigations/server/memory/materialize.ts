/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxApiClient } from '../tools/sandbox_bash/grpc_client';
import type { MemoryPageStore } from './page_store';
import { type MemoryPage } from '../../common/memory';

export const MEMORY_WORKSPACE_ROOT = '/workspace/memories';

const README_CONTENT = `# Semantic Memories

A historical log of past incidents, failure signatures, and operational learnings. 
Read these memories to check if this problem has happened before and how it was resolved.

Start here, then open \`INDEX.md\` and read relevant pages with \`nightshift_sandbox_view_file\`.
Do not edit these pages yourself — a parallel optimizer evaluates useful pages after the run.
`;

const pagePath = (slug: string): string => `${MEMORY_WORKSPACE_ROOT}/${slug}.md`;

const renderIndex = (pages: MemoryPage[]): string => {
  const lines = [
    '# Memory index',
    '',
    'Open a page with `nightshift_sandbox_view_file` using the path in parentheses.',
    '',
  ];

  for (const page of pages) {
    const path = pagePath(page.slug);
    const cr = page.telemetry.impressions > 0 ? (page.telemetry.conversions / page.telemetry.impressions) : 0;
    const usefulnessPct = Math.round(cr * 100);
    lines.push(`- **${page.title}** (Useful: ${usefulnessPct}%, Impressions: ${Math.round(page.telemetry.impressions)}x) — \`${path}\``);
  }

  if (pages.length === 0) {
    lines.push('_No Semantic Memories available yet._');
    lines.push('');
  }

  return lines.join('\n');
};

const renderPage = (page: MemoryPage): string => {
  const cr = page.telemetry.impressions > 0 ? (page.telemetry.conversions / page.telemetry.impressions) : 0;
  const usefulnessPct = Math.round(cr * 100);

  const header = [
    `---`,
    `title: ${page.title}`,
    `status: ${page.status}`,
    `usefulness: ${usefulnessPct}%`,
    `impressions: ${Math.round(page.telemetry.impressions)}x`,
    `updated_at: ${page.updated_at}`,
    ...(page.description !== undefined ? [`description: ${page.description}`] : []),
    `---`,
    '',
    `# ${page.title}`,
    '',
  ];
  return `${header.join('\n')}${page.content.trim()}\n`;
};

export const materializeMemory = async ({
  apiClient,
  conversationId,
  store,
  logger,
}: {
  apiClient: SandboxApiClient;
  conversationId: string;
  store: MemoryPageStore;
  logger: Logger;
}): Promise<void> => {
  const { pages: allPages } = await store.list();
  const pages = allPages.filter((page) => page.status !== 'archived');

  await apiClient.mkdirs(conversationId, [MEMORY_WORKSPACE_ROOT]);

  // Write all memory Markdown pages
  await apiClient.writeFiles(
    conversationId,
    pages.map((page) => ({
      path: pagePath(page.slug),
      content: Buffer.from(renderPage(page), 'utf8'),
    }))
  );

  // Write README.md and INDEX.md
  await apiClient.writeFiles(conversationId, [
    { path: `${MEMORY_WORKSPACE_ROOT}/README.md`, content: Buffer.from(README_CONTENT, 'utf8') },
    { path: `${MEMORY_WORKSPACE_ROOT}/INDEX.md`, content: Buffer.from(renderIndex(pages), 'utf8') },
  ]);

  logger.info(
    `Materialized ${pages.length} Semantic Memory page(s) into sandbox conversation ${conversationId}`
  );
};
