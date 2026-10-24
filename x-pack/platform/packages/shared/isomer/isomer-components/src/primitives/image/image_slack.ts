/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SlackAssetCollector,
  SlackContextBlock,
  SlackImageBlock,
} from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, clampSlackText } from '@elastic/isomer-sdk/slack';

import { clampEscapedMrkdwn, oneLine } from '../../lib';
import type { ImageNode } from './image';
import { imageLabel } from './image_label';

/** What Slack shows when the image can't be uploaded: its name, as a line of context. */
const fallbackBlock = (node: ImageNode): SlackContextBlock => ({
  type: 'context',
  elements: [
    {
      type: 'mrkdwn',
      text: clampEscapedMrkdwn(imageLabel(node), SLACK_LIMITS.contextElementChars),
    },
  ],
});

/**
 * An `image` block referencing the file by a placeholder ref, which the host swaps for Slack's
 * file id once it has uploaded the file. Without a collector, the host can't upload, so the image
 * renders as its name.
 */
export const imageSlackRenderer = (
  node: ImageNode,
  { collector }: { collector?: SlackAssetCollector }
): SlackImageBlock | SlackContextBlock => {
  if (!collector) {
    return fallbackBlock(node);
  }
  const alt = oneLine(node.alt);
  return {
    type: 'image',
    alt_text: clampSlackText(alt, SLACK_LIMITS.imageAltTextChars),
    title: {
      type: 'plain_text',
      text: clampSlackText(oneLine(node.name ?? node.alt), SLACK_LIMITS.imageTitleChars),
    },
    slack_file: { ref: collector.allocate(node, alt) },
  };
};
