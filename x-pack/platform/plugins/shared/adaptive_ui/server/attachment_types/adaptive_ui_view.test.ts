/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { text, view } from '@kbn/adaptive-ui/builders';
import type { ViewSpec } from '@kbn/adaptive-ui';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentFormatContext } from '@kbn/agent-builder-server/attachments';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import { adaptiveUiViewAttachmentType } from './adaptive_ui_view';

const validSpec: ViewSpec = view({
  title: 'Cluster status',
  body: [text({ body: 'All nodes healthy.' })],
});

describe('adaptiveUiViewAttachmentType', () => {
  it('registers with the expected id', () => {
    expect(adaptiveUiViewAttachmentType.id).toBe(ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE);
  });

  describe('validate', () => {
    it('accepts a valid ViewSpec and returns it as data', () => {
      expect(adaptiveUiViewAttachmentType.validate(validSpec)).toEqual({
        valid: true,
        data: validSpec,
      });
    });

    it('rejects non-spec input', () => {
      expect(adaptiveUiViewAttachmentType.validate({ nonsense: true })).toMatchObject({
        valid: false,
      });
      expect(adaptiveUiViewAttachmentType.validate('not a spec')).toMatchObject({ valid: false });
      expect(adaptiveUiViewAttachmentType.validate(null)).toMatchObject({ valid: false });
    });
  });

  describe('format', () => {
    it('renders the spec to a text representation', async () => {
      const attachment = {
        id: 'att-1',
        type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
        data: validSpec,
      } as Attachment<typeof ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, ViewSpec>;

      const formatted = await adaptiveUiViewAttachmentType.format(
        attachment,
        {} as AttachmentFormatContext
      );
      const representation = await formatted.getRepresentation!();

      // `AttachmentRepresentation` is a union with the image variant, which has no `value`.
      if (representation.type !== 'text') {
        throw new Error(`expected a text representation, got "${representation.type}"`);
      }

      expect(representation.value.toLowerCase()).toContain('cluster status');
      expect(representation.value).toContain('All nodes healthy.');
    });
  });

  describe('getAgentDescription', () => {
    it('mentions the attachment type and the render_view tool', () => {
      const description = adaptiveUiViewAttachmentType.getAgentDescription!();
      expect(description).toContain(ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE);
      expect(description).toContain('render_view');
    });
  });
});
