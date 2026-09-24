/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationTemplateTabDefinition,
  ConversationTemplateUIDefinition,
} from '@kbn/agent-builder-browser';
import { ConversationTemplatesService } from './conversation_templates_service';

const overviewTab: ConversationTemplateTabDefinition = {
  label: 'Overview',
  content: () => null,
};

const phishingDefinition: ConversationTemplateUIDefinition = {
  name: 'Phishing Investigation',
  tabs: ['overview'],
};

describe('ConversationTemplatesService', () => {
  it('registers a tab and returns it via getTab', () => {
    const service = new ConversationTemplatesService();
    service.registerTab('overview', overviewTab);

    expect(service.getTab('overview')).toBe(overviewTab);
  });

  it('throws when registering a duplicate tab id', () => {
    const service = new ConversationTemplatesService();
    service.registerTab('overview', overviewTab);

    expect(() => service.registerTab('overview', overviewTab)).toThrowError(
      'Conversation template tab "overview" is already registered.'
    );
  });

  it('registers a template UI definition and returns it via getTemplateUIDefinition', () => {
    const service = new ConversationTemplatesService();
    service.registerTemplateUIDefinition('phishing', phishingDefinition);

    expect(service.getTemplateUIDefinition('phishing')).toBe(phishingDefinition);
  });

  it('throws when registering a duplicate template id', () => {
    const service = new ConversationTemplatesService();
    service.registerTemplateUIDefinition('phishing', phishingDefinition);

    expect(() => service.registerTemplateUIDefinition('phishing', phishingDefinition)).toThrowError(
      'Conversation template "phishing" already has a UI definition.'
    );
  });

  it('returns undefined for unknown ids', () => {
    const service = new ConversationTemplatesService();
    expect(service.getTab('unknown')).toBeUndefined();
    expect(service.getTemplateUIDefinition('unknown')).toBeUndefined();
  });
});
