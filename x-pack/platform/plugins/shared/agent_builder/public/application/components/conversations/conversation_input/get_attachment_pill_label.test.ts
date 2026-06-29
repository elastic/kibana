/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import { getAttachmentPillLabel } from './get_attachment_pill_label';

describe('getAttachmentPillLabel', () => {
  it('prefixes the display name with the type label', () => {
    const uiDefinition = {
      getLabel: () => 'My Dashboard',
      getTypeLabel: () => 'Dashboard',
    } as AttachmentUIDefinition;

    expect(getAttachmentPillLabel({ type: 'dashboard' }, uiDefinition, 'My Dashboard')).toBe(
      'Dashboard: My Dashboard'
    );
  });

  it('uses a humanized attachment type when getTypeLabel is omitted', () => {
    expect(getAttachmentPillLabel({ type: 'entity_analytics_dashboard' }, undefined, 'Alerts')).toBe(
      'Entity Analytics Dashboard: Alerts'
    );
  });

  it('returns only the display name when it matches the type label', () => {
    const uiDefinition = {
      getLabel: () => 'Text',
      getTypeLabel: () => 'Text',
    } as AttachmentUIDefinition;

    expect(getAttachmentPillLabel({ type: 'text' }, uiDefinition, 'Text')).toBe('Text');
  });
});
