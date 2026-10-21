/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';

/**
 * A file an `image` block in {@link SlackPayload.blocks} references by placeholder: its
 * `slack_file.ref` is {@link SlackPayloadAsset.ref}. The poster uploads the file, then replaces
 * that `slack_file` with the uploaded file's id before posting. If the upload fails, it posts
 * {@link SlackPayloadAsset.fallback_blocks} in the image block's place, so the message still posts.
 */
export interface SlackPayloadAsset {
  /** The placeholder in the `image` block's `slack_file.ref`. */
  ref: string;
  /** The file's bytes, base64-encoded. */
  data: string;
  mime_type: string;
  /** File name for the upload. */
  filename: string;
  /** Alt text for the upload, the same as the `image` block's. */
  alt_text: string;
  /** Blocks to post in the `image` block's place when the upload fails. */
  fallback_blocks: SlackBlock[];
}

/**
 * Raw Slack message payload: `text` is the notification and fallback copy, `blocks` is what gets
 * posted.
 */
export interface SlackPayload {
  text: string;
  blocks: SlackBlock[];
  /**
   * Files to upload before posting, one per `image` block with a `slack_file.ref`. Only present
   * when the callback asked for them with `surface_assets`: posting `blocks` without uploading
   * them fails the whole message.
   */
  assets?: SlackPayloadAsset[];
}

/** The response message ready to post on the surface the round came from, such as Slack. */
export type SurfacePayload = SlackPayload;
