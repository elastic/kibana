/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationOriginType } from '@kbn/agent-builder-common';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';

/**
 * An assistant reply on its way to an external surface, before projection.
 *
 * `message` still contains the `<render_attachment>` tags the Kibana transcript
 * renders inline; a projector's job is to turn them into something the surface
 * can display, since no browser runs on that path.
 */
export interface SurfaceProjectionInput {
  /** Assistant message text, tags included. */
  message: string;
  /** Conversation attachments as of this point in the round, for resolving tags. */
  attachments: VersionedAttachment[];
  /** Round-level refs, used to pick a version when a tag does not name one. */
  attachmentRefs?: AttachmentVersionRef[];
  /** Space the execution ran in; external surfaces need absolute, space-aware links. */
  spaceId: string;
}

/**
 * A rasterized chart the host must upload before it can post `blocks`.
 *
 * Slack has no chart block, so a chart renders as an `image` block holding a placeholder
 * `slack_file` ref. The host uploads the PNG and rewrites the matching ref to the file id
 * it gets back — only the host holds the surface credential, so only it can upload.
 */
export interface SurfaceProjectionAsset {
  /** Placeholder ref carried by the `image` block this PNG belongs to. */
  ref: string;
  png: Buffer;
  altText: string;
}

/**
 * A reply rewritten for one surface. `message` is always populated so a host that
 * understands nothing else still has something to post.
 */
export interface SurfaceProjection {
  /** Surface-ready text. No `<render_attachment>` tags survive here. */
  message: string;
  /**
   * Optional richer payload (for Slack, Block Kit blocks). Hosts that cannot use
   * it fall back to `message`.
   */
  blocks?: unknown[];
  /**
   * Assets `blocks` references by placeholder ref. A host that cannot upload must
   * discard `blocks` too, since an unresolved ref fails the whole message.
   */
  assets?: SurfaceProjectionAsset[];
}

/**
 * Projects assistant replies for one external surface.
 *
 * Registered by the plugin that owns the surface's rendering — Agent Builder holds
 * the registry but stays ignorant of how any given surface renders, which is what
 * keeps the dependency pointing one way.
 */
export interface SurfaceProjectorDefinition {
  /** Origin type this projector handles; matched against the execution's origin. */
  surface: ConversationOriginType;
  /**
   * Returns the projected reply, or `undefined` to leave the reply untouched.
   * Must not throw: a projector failure degrades to the unprojected message.
   */
  project(input: SurfaceProjectionInput): Promise<SurfaceProjection | undefined>;
}
