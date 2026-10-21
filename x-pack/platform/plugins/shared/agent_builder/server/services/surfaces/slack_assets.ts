/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type {
  SlackAssetRequest,
  SlackBlock,
  SlackContainerChildBlock,
} from '@elastic/isomer-sdk/slack';
import type { AttachmentSurfaceCompositionContext } from '@kbn/agent-builder-server/attachments';
import type { Logger } from '@kbn/logging';

/**
 * Decoded bytes a Slack payload may carry across all its assets. Base64 adds a third, so 2 MiB
 * keeps the payload under Relay's 4 MiB request limit, with room for the blocks.
 */
export const MAX_SLACK_ASSET_BYTES = 2 * 1024 * 1024;

/** A file to upload to Slack for an asset. */
export interface SlackAssetFile {
  data: Buffer;
  mimeType: string;
  filename: string;
}

/**
 * Loads the file for the nodes of one type that a Slack render turned into `image` blocks, such as
 * an image from the Files plugin. A chart source would draw its node instead.
 */
export interface SlackAssetSource {
  /** The node type whose asset requests this source loads. */
  nodeType: string;
  /**
   * Loads the file for `node`, as the user the payload renders for. Rejects when it can't, or when
   * the file is larger than `maxBytes`, so a source can refuse before reading a file that won't fit.
   */
  load(
    node: PrimitiveNode,
    options: AttachmentSurfaceCompositionContext & { maxBytes: number }
  ): Promise<SlackAssetFile>;
}

/** An asset request whose file loaded. */
export interface LoadedSlackAsset extends SlackAssetRequest {
  file: SlackAssetFile;
}

/**
 * Loads the file of each asset request through the source for its node type, in allocation
 * order, until `maxBytes` of files are loaded. A request that has no source, fails to load, or
 * doesn't fit the bytes left is `failed`, and logged; a smaller one after it may still fit.
 */
export const loadSlackAssets = async ({
  requests,
  sources,
  context,
  logger,
  maxBytes = MAX_SLACK_ASSET_BYTES,
}: {
  requests: readonly SlackAssetRequest[];
  sources: readonly SlackAssetSource[];
  context: AttachmentSurfaceCompositionContext;
  logger: Logger;
  maxBytes?: number;
}): Promise<{ loaded: LoadedSlackAsset[]; failed: SlackAssetRequest[] }> => {
  const loaded: LoadedSlackAsset[] = [];
  const failed: SlackAssetRequest[] = [];
  let bytesLeft = maxBytes;

  for (const request of requests) {
    const { ref, node } = request;
    const source = sources.find(({ nodeType }) => nodeType === node.type);

    try {
      if (!source) {
        throw new Error('no asset source loads this node type');
      }

      // Sequential, so at most one file past the budget is ever held.
      const file = await source.load(node, { ...context, maxBytes: bytesLeft });

      if (file.data.byteLength > bytesLeft) {
        throw new Error(`${file.data.byteLength} bytes is more than the ${bytesLeft} left`);
      }

      bytesLeft -= file.data.byteLength;
      loaded.push({ ...request, file });
    } catch (error) {
      logger.warn(`Showing Slack asset "${ref}" (${node.type}) as text: ${error.message}`);
      failed.push(request);
    }
  }

  return { loaded, failed };
};

const imageRef = (block: SlackBlock): string | undefined =>
  block.type === 'image' ? block.slack_file?.ref : undefined;

/** Blocks a container can hold: Slack rejects a nested `container`. */
const containerChildren = (blocks: readonly SlackBlock[]): SlackContainerChildBlock[] =>
  blocks.filter((block): block is SlackContainerChildBlock => block.type !== 'container');

/**
 * Replaces each `image` block whose `slack_file.ref` is in `fallbacks` with that ref's blocks,
 * including inside containers, so no block references a file that won't be uploaded.
 */
export const replaceAssetBlocks = (
  blocks: readonly SlackBlock[],
  fallbacks: ReadonlyMap<string, readonly SlackBlock[]>
): SlackBlock[] =>
  blocks.flatMap((block): SlackBlock[] => {
    const ref = imageRef(block);

    if (ref !== undefined && fallbacks.has(ref)) {
      return [...(fallbacks.get(ref) ?? [])];
    }

    if (block.type === 'container') {
      const childBlocks = containerChildren(replaceAssetBlocks(block.child_blocks, fallbacks));
      return childBlocks.length > 0 ? [{ ...block, child_blocks: childBlocks }] : [];
    }

    return [block];
  });
