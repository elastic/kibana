/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@kbn/adaptive-ui';
import type { SlackBlock, SlackRenderResult } from '@kbn/adaptive-ui';

/** Side effects {@link prepareSlackAssets} needs, injected so it stays pure. */
export interface SlackAssetDeps {
  renderPng: (node: PrimitiveNode, altText: string) => Promise<Buffer>;
  upload: (bytes: Buffer, altText: string) => Promise<string>;
}

export interface PreparedSlackMessage {
  blocks: SlackBlock[];
}

/**
 * Resolves the placeholder `slack_file` image blocks in a
 * {@link SlackRenderResult}: renders each requested node to PNG, uploads it, and
 * rewrites the matching block's `slack_file` from `{ ref }` to `{ id }`. Returns
 * the original blocks unchanged when there are no assets.
 */
export const prepareSlackAssets = async (
  result: SlackRenderResult,
  { renderPng, upload }: SlackAssetDeps
): Promise<PreparedSlackMessage> => {
  if (result.assets.length === 0) {
    return { blocks: result.blocks };
  }

  const refToId = new Map<string, string>();
  for (const { ref, node, altText } of result.assets) {
    const bytes = await renderPng(node, altText);
    refToId.set(ref, await upload(bytes, altText));
  }

  return { blocks: result.blocks.map((block) => patchBlock(block, refToId)) };
};

const patchBlock = (block: SlackBlock, refToId: ReadonlyMap<string, string>): SlackBlock => {
  if (block.type !== 'image') {
    return block;
  }
  const ref = block.slack_file?.ref;
  if (ref === undefined) {
    return block;
  }
  const id = refToId.get(ref);
  if (id === undefined) {
    return block;
  }
  return { ...block, slack_file: { id } };
};
