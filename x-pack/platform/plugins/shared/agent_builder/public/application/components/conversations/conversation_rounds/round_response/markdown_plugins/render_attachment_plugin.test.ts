/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderAttachmentTagParser, resolveAttachmentVersion } from './render_attachment_plugin';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';

const createMockAttachment = (versions: number[] = [1, 3, 2]) =>
  ({
    id: 'attachment-1',
    type: 'dashboard',
    versions: versions.map((version) => ({ version })),
    current_version: Math.max(...versions, 0),
    active: true,
  } as VersionedAttachment);

const mockAttachment = createMockAttachment();

describe('resolveAttachmentVersion', () => {
  it('returns explicit numeric version', () => {
    const result = resolveAttachmentVersion({
      explicitVersion: 5,
      attachment: mockAttachment,
    });

    expect(result).toBe(5);
  });

  it('parses explicit string version', () => {
    const result = resolveAttachmentVersion({
      explicitVersion: '3',
      attachment: mockAttachment,
    });

    expect(result).toBe(3);
  });

  it('returns undefined for invalid version string', () => {
    const result = resolveAttachmentVersion({
      explicitVersion: 'abc',
      attachment: mockAttachment,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined for non-positive explicit version', () => {
    const zeroVersion = resolveAttachmentVersion({
      explicitVersion: 0,
      attachment: mockAttachment,
    });
    const negativeVersion = resolveAttachmentVersion({
      explicitVersion: -1,
      attachment: mockAttachment,
    });

    expect(zeroVersion).toBeUndefined();
    expect(negativeVersion).toBeUndefined();
  });

  it('falls back to highest attachment version when explicit version is missing', () => {
    const result = resolveAttachmentVersion({
      explicitVersion: undefined as unknown as string | number,
      attachment: createMockAttachment([2, 7, 4]),
    });

    expect(result).toBe(7);
  });

  it('returns undefined when explicit version is missing and attachment has no versions', () => {
    const result = resolveAttachmentVersion({
      explicitVersion: undefined as unknown as string | number,
      attachment: createMockAttachment([]),
    });

    expect(result).toBeUndefined();
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
      version: '2',
    });
  });
});
