/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { renderAttachmentTagParser, resolveAttachmentVersion } from './render_attachment_plugin';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';

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
        conversationAttachments: [attachment],
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
        conversationAttachments: [attachment],
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
        conversationAttachments: [attachment],
      });

      expect(result).toBe(2);
    });
  });

  describe('when explicitVersion is undefined', () => {
    it('returns the ref version when there is a single matching ref', () => {
      const attachment = createMockAttachment(attachmentId);
      const attachmentRefs: AttachmentVersionRef[] = [{ attachment_id: attachmentId, version: 5 }];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
        conversationAttachments: [attachment],
      });

      expect(result).toBe(5);
    });

    it('returns the highest version when multiple refs match the attachmentId', () => {
      const attachment = createMockAttachment(attachmentId);
      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: attachmentId, version: 2 },
        { attachment_id: attachmentId, version: 8 },
        { attachment_id: attachmentId, version: 5 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
        conversationAttachments: [attachment],
      });

      expect(result).toBe(8);
    });

    it('only considers refs matching the attachmentId when finding the highest version', () => {
      const attachment = createMockAttachment(attachmentId);
      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: 'other-attachment', version: 100 },
        { attachment_id: attachmentId, version: 3 },
        { attachment_id: attachmentId, version: 7 },
        { attachment_id: 'another-attachment', version: 50 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
        conversationAttachments: [attachment],
      });

      expect(result).toBe(7);
    });
  });

  describe('when no refs match but other refs exist (time boundary inference)', () => {
    it('returns the highest version created before the latest ref time', () => {
      // Attachment we're rendering has 3 versions
      const attachment = createMockAttachment(attachmentId, [
        { version: 1, created_at: '2024-01-01T10:00:00Z' },
        { version: 2, created_at: '2024-01-02T10:00:00Z' },
        { version: 3, created_at: '2024-01-04T10:00:00Z' }, // After the ref time
      ]);

      // Other attachment that IS in refs (created at 2024-01-03)
      const otherAttachment = createMockAttachment('other-attachment', [
        { version: 1, created_at: '2024-01-03T10:00:00Z' },
      ]);

      // Refs only contain the other attachment
      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: 'other-attachment', version: 1 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
        conversationAttachments: [attachment, otherAttachment],
      });

      // Should return version 2, as it was created before the ref time (2024-01-03)
      // Version 3 was created after, so it's excluded
      expect(result).toBe(2);
    });

    it('returns the highest version when all versions are before the latest ref time', () => {
      const attachment = createMockAttachment(attachmentId, [
        { version: 1, created_at: '2024-01-01T10:00:00Z' },
        { version: 2, created_at: '2024-01-02T10:00:00Z' },
      ]);

      const otherAttachment = createMockAttachment('other-attachment', [
        { version: 1, created_at: '2024-01-05T10:00:00Z' },
      ]);

      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: 'other-attachment', version: 1 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
        conversationAttachments: [attachment, otherAttachment],
      });

      expect(result).toBe(2);
    });

    it('returns latest version when all versions are after the latest ref time', () => {
      const attachment = createMockAttachment(attachmentId, [
        { version: 1, created_at: '2024-01-10T10:00:00Z' },
        { version: 2, created_at: '2024-01-11T10:00:00Z' },
      ]);

      const otherAttachment = createMockAttachment('other-attachment', [
        { version: 1, created_at: '2024-01-05T10:00:00Z' },
      ]);

      const attachmentRefs: AttachmentVersionRef[] = [
        { attachment_id: 'other-attachment', version: 1 },
      ];

      const result = resolveAttachmentVersion({
        explicitVersion: undefined,
        attachmentId,
        attachmentRefs,
        attachment,
        conversationAttachments: [attachment, otherAttachment],
      });

      // Falls back to latest version
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
        conversationAttachments: [attachment],
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
        conversationAttachments: [attachment],
      });

      expect(result).toBeUndefined();
    });
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
});
