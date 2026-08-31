/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from './panel_context_attachment';
import { readPanelContextData } from './read_panel_context_data';

const makeAttachment = (versions: Array<{ version: number; data: unknown }>, currentVersion = 1) =>
  ({
    id: 'att-1',
    type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
    current_version: currentVersion,
    versions,
  } as unknown as VersionedAttachment);

const validData = { panel_template: '<p>hi</p>', embeddable_id: 'p1' };

describe('readPanelContextData', () => {
  it('returns the current version, not the latest written', () => {
    const attachment = makeAttachment(
      [
        { version: 1, data: validData },
        { version: 2, data: { ...validData, panel_template: '<p>newer</p>' } },
      ],
      2
    );

    expect(readPanelContextData(attachment)?.panel_template).toBe('<p>newer</p>');
  });

  it('returns undefined for data that is not a panel context', () => {
    expect(
      readPanelContextData(makeAttachment([{ version: 1, data: { title: 'A dashboard' } }]))
    ).toBeUndefined();
  });

  it('returns undefined when the attachment has no matching version', () => {
    expect(
      readPanelContextData(makeAttachment([{ version: 1, data: validData }], 7))
    ).toBeUndefined();
  });
});
