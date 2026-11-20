/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema } from '@kbn/custom-app-common';
import { customAppContextAttachmentDataSchema } from '../../common/app_context_attachment';
import {
  buildCustomAppContextAttachment,
  createPageAttachmentId,
  getCustomAppAttachmentId,
} from './chat_integration';

const document = appDocumentSchema.parse({
  root: { type: 'heading', id: 'title', text: 'Service health' },
});

describe('buildCustomAppContextAttachment', () => {
  it('makes an attachment of the app context kind, carrying the panel, its title and the app', () => {
    const attachment = buildCustomAppContextAttachment({
      document,
      embeddableId: 'panel-1',
      panelTitle: 'My app',
    });

    expect(attachment.type).toBe('platform.custom_app.app_context');
    expect(attachment.data).toEqual({
      embeddable_id: 'panel-1',
      panel_title: 'My app',
      document,
    });
  });

  it('has an id that is the same every time for a panel, so sending it again replaces it', () => {
    const build = () => buildCustomAppContextAttachment({ document, embeddableId: 'panel-1' });

    expect(build().id).toBe(build().id);
    expect(build().id).toBe(getCustomAppAttachmentId('panel-1'));
    expect(build().id).toBe('platform.custom_app.app_context-panel-1');
  });

  it('has a different id for each panel, so two apps in one conversation stay apart', () => {
    expect(getCustomAppAttachmentId('a')).not.toBe(getCustomAppAttachmentId('b'));
  });

  it('leaves the title out for a panel that has none', () => {
    const { data } = buildCustomAppContextAttachment({ document, embeddableId: 'panel-1' });

    expect(data).not.toHaveProperty('panel_title');
  });

  it('cuts a long title short rather than let it make the attachment invalid', () => {
    const { data } = buildCustomAppContextAttachment({
      document,
      embeddableId: 'panel-1',
      panelTitle: 'x'.repeat(1000),
    });

    expect(data?.panel_title).toHaveLength(256);
    expect(customAppContextAttachmentDataSchema.safeParse(data).success).toBe(true);
  });

  it('makes data the server accepts, so what the browser sends is what the attachment type validates', () => {
    const { data } = buildCustomAppContextAttachment({
      document,
      embeddableId: 'panel-1',
      panelTitle: 'My app',
    });

    expect(customAppContextAttachmentDataSchema.safeParse(data).success).toBe(true);
  });
});

describe('the attachment of an app on a page, which has no panel', () => {
  it('has the id it was given, and no panel in its data, so the agent changes it by that id', () => {
    const attachment = buildCustomAppContextAttachment({ document, attachmentId: 'page-1' });

    expect(attachment.id).toBe('page-1');
    expect(attachment.data).toEqual({ document });
    expect(attachment.data).not.toHaveProperty('embeddable_id');
  });

  it('is accepted by what receives it, as an app of a panel is', () => {
    const { data } = buildCustomAppContextAttachment({ document, attachmentId: 'page-1' });

    expect(customAppContextAttachmentDataSchema.safeParse(data).success).toBe(true);
  });

  it('is known by its panel when it has one, whatever id it is also given', () => {
    const attachment = buildCustomAppContextAttachment({
      document,
      embeddableId: 'panel-1',
      attachmentId: 'ignored',
    });

    expect(attachment.id).toBe(getCustomAppAttachmentId('panel-1'));
  });

  it('is given an id of its own for each page, which is of its kind', () => {
    const first = createPageAttachmentId();
    const second = createPageAttachmentId();

    expect(first).toMatch(/^platform\.custom_app\.app_context-page-/);
    expect(first).not.toBe(second);
  });
});
