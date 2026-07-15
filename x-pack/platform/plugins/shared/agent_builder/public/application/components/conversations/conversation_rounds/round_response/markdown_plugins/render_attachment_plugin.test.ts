/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import type { Node, Parent } from 'unist';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import {
  createRenderAttachmentRenderer,
  renderAttachmentTagParser,
  resolveAttachmentVersion,
} from './render_attachment_plugin';
import { AttachmentLoadingSkeleton } from '../attachments/attachment_loading_skeleton';
import { InlineAttachmentWithActions } from '../attachments/inline_attachment_with_actions';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import { parseMarkdown } from './test_utils';
import type { MutableNode } from './utils';

const collectNodesByType = (tree: Node, type: string): MutableNode[] => {
  const found: MutableNode[] = [];
  const walk = (node: Node) => {
    if (node.type === type) {
      found.push(node as MutableNode);
    }
    if ('children' in node) {
      (node as Parent).children.forEach(walk);
    }
  };
  walk(tree);
  return found;
};

const collectTextValues = (tree: Node): string[] =>
  collectNodesByType(tree, 'text').map((n) => n.value ?? '');

const createMockAttachment = (
  id: string,
  versions: { version: number; created_at: string }[] = [
    { version: 1, created_at: '2024-01-01T10:00:00Z' },
  ]
): VersionedAttachment =>
  ({
    id,
    type: 'dashboard',
    versions: versions.map((v) => ({
      version: v.version,
      created_at: v.created_at,
      data: {},
      content_hash: 'hash',
    })),
    current_version: Math.max(...versions.map((v) => v.version), 0),
    active: true,
  } as VersionedAttachment);

describe('resolveAttachmentVersion', () => {
  const attachmentId = 'attachment-1';

  describe('when explicitVersion is provided', () => {
    it('returns the explicit version as a number', () => {
      const attachment = createMockAttachment(attachmentId);
      const result = resolveAttachmentVersion({
        explicitVersion: 5,
        attachmentId,
        attachmentRefs: undefined,
        attachment,
      });

      expect(result).toBe(5);
    });

    it('parses a string explicit version to a number', () => {
      const attachment = createMockAttachment(attachmentId);
      const result = resolveAttachmentVersion({
        explicitVersion: '3',
        attachmentId,
        attachmentRefs: undefined,
        attachment,
      });

      expect(result).toBe(3);
    });

    it('ignores attachmentRefs when explicit version is provided', () => {
      const attachment = createMockAttachment(attachmentId);
      const attachmentRefs: AttachmentVersionRef[] = [{ attachment_id: attachmentId, version: 10 }];

      const result = resolveAttachmentVersion({
        explicitVersion: 2,
        attachmentId,
        attachmentRefs,
        attachment,
      });

      expect(result).toBe(2);
    });
  });

  describe('when explicitVersion is undefined', () => {
    it('returns the ref version when there is a matching ref', () => {
      const attachment = createMockAttachment(attachmentId);
      const attachmentRefs: AttachmentVersionRef[] = [{ attachment_id: attachmentId, version: 5 }];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
      });

      expect(result).toBe(5);
    });

    it('only considers refs matching the attachmentId', () => {
      const attachment = createMockAttachment(attachmentId);
      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: 'other-attachment', version: 100 },
        { attachment_id: attachmentId, version: 3 },
        { attachment_id: 'another-attachment', version: 50 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
      });

      expect(result).toBe(3);
    });

    it('returns latest version when no refs match', () => {
      const attachment = createMockAttachment(attachmentId, [
        { version: 1, created_at: '2024-01-01T10:00:00Z' },
        { version: 2, created_at: '2024-01-02T10:00:00Z' },
      ]);
      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: 'other-attachment', version: 1 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
      });

      expect(result).toBe(2);
    });
  });

  describe('when no refs exist at all', () => {
    it('returns the latest version as fallback', () => {
      const attachment = createMockAttachment(attachmentId, [
        { version: 1, created_at: '2024-01-01T10:00:00Z' },
        { version: 2, created_at: '2024-01-02T10:00:00Z' },
      ]);

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs: undefined,
        attachment,
      });

      expect(result).toBe(2);
    });

    it('returns undefined when attachment has no versions', () => {
      const attachment = createMockAttachment(attachmentId, []);

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs: undefined,
        attachment,
      });

      expect(result).toBeUndefined();
    });
  });
});

describe('createRenderAttachmentRenderer', () => {
  const attachmentId = 'attachment-1';
  const conversationId = 'conversation-1';
  const attachmentsService = {
    getAttachmentUiDefinition: jest.fn(),
    updateOrigin: jest.fn(),
  } as unknown as AttachmentsService;

  const baseAttachment = createMockAttachment(attachmentId, [
    { version: 1, created_at: '2024-01-01T10:00:00Z' },
    { version: 2, created_at: '2024-01-02T10:00:00Z' },
  ]);

  it('renders a skeleton when isStreaming is true, even if the attachment is in the cache', () => {
    const renderer = createRenderAttachmentRenderer({
      attachmentsService,
      conversationAttachments: [baseAttachment],
      attachmentRefs: undefined,
      conversationId,
      isSidebar: false,
      isStreaming: true,
    });

    const element = renderer({ attachmentId });
    expect(element).not.toBeNull();
    expect((element as ReactElement).type).toBe(AttachmentLoadingSkeleton);
  });

  it('renders a skeleton when isStreaming is true and the attachment is missing from the cache', () => {
    const renderer = createRenderAttachmentRenderer({
      attachmentsService,
      conversationAttachments: [],
      attachmentRefs: undefined,
      conversationId,
      isSidebar: false,
      isStreaming: true,
    });

    const element = renderer({ attachmentId });
    expect((element as ReactElement).type).toBe(AttachmentLoadingSkeleton);
  });

  it('renders the inline attachment card when isStreaming is false and the attachment is in the cache', () => {
    const renderer = createRenderAttachmentRenderer({
      attachmentsService,
      conversationAttachments: [baseAttachment],
      attachmentRefs: undefined,
      conversationId,
      isSidebar: false,
      isStreaming: false,
    });

    const element = renderer({ attachmentId });
    expect((element as ReactElement).type).toBe(InlineAttachmentWithActions);
  });

  it('still falls back to a skeleton when not streaming but the attachment is missing from the cache', () => {
    const renderer = createRenderAttachmentRenderer({
      attachmentsService,
      conversationAttachments: [],
      attachmentRefs: undefined,
      conversationId,
      isSidebar: false,
      isStreaming: false,
    });

    const element = renderer({ attachmentId });
    expect((element as ReactElement).type).toBe(AttachmentLoadingSkeleton);
  });

  it('returns null when attachmentId or conversationId is missing (regardless of streaming)', () => {
    const renderer = createRenderAttachmentRenderer({
      attachmentsService,
      conversationAttachments: [baseAttachment],
      attachmentRefs: undefined,
      conversationId: undefined,
      isSidebar: false,
      isStreaming: true,
    });

    expect(renderer({ attachmentId })).toBeNull();
    expect(renderer({ attachmentId: undefined })).toBeNull();
  });
});

describe('renderAttachmentTagParser', () => {
  it('maps version attribute to renderer version prop', () => {
    const parser = renderAttachmentTagParser();
    const tree = {
      type: 'root',
      children: [
        {
          type: 'html',
          value: `<${renderAttachmentElement.tagName} ${renderAttachmentElement.attributes.attachmentId}="dash-1" ${renderAttachmentElement.attributes.version}="2"/>`,
        },
      ],
    };

    parser(tree as any);

    expect(tree.children[0]).toMatchObject({
      type: renderAttachmentElement.tagName,
      attachmentId: 'dash-1',
      attachmentVersion: '2',
    });
  });

  describe('with markdown parsed by remark (real pipeline)', () => {
    const tag = (id: string, version = '1') =>
      `<${renderAttachmentElement.tagName} ${renderAttachmentElement.attributes.attachmentId}="${id}" ${renderAttachmentElement.attributes.version}="${version}"/>`;

    it('parses a tag that stands alone in its own paragraph', () => {
      const tree = parseMarkdown(tag('dash-1', '2'));

      const nodes = collectNodesByType(tree, renderAttachmentElement.tagName);
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({
        type: renderAttachmentElement.tagName,
        attachmentId: 'dash-1',
        attachmentVersion: '2',
      });
    });

    it('parses a tag when text sits on the line directly above it (same paragraph)', () => {
      const markdown = `Rule:\n${tag('rule-1')}\n\nPreview:\n${tag('preview-1')}`;

      const tree = parseMarkdown(markdown);

      const nodes = collectNodesByType(tree, renderAttachmentElement.tagName);
      expect(nodes.map((n) => n.attachmentId)).toEqual(['rule-1', 'preview-1']);

      // The literal tag markup must not survive as visible text.
      const allText = collectTextValues(tree).join('');
      expect(allText).not.toContain('render_attachment');
      // Surrounding prose must be preserved.
      expect(allText).toContain('Rule:');
      expect(allText).toContain('Preview:');
    });

    it('parses a tag with trailing text on the same line', () => {
      const markdown = `${tag('rule-1')} was generated.`;

      const tree = parseMarkdown(markdown);

      const nodes = collectNodesByType(tree, renderAttachmentElement.tagName);
      expect(nodes.map((n) => n.attachmentId)).toEqual(['rule-1']);

      const allText = collectTextValues(tree).join('');
      expect(allText).not.toContain('render_attachment');
      expect(allText).toContain('was generated.');
    });
  });
});
