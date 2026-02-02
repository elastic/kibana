/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/observability-ai-assistant-plugin/common';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { LogAIAssistant } from './log_ai_assistant';

const observabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();
jest
  .spyOn(observabilityAIAssistant, 'getContextualInsightMessages')
  .mockReturnValue([{ message: { content: 'hello' } } as Message]);

describe('LogAIAssistant', () => {
  describe('when a message field is present', () => {
    it('shows the assistant panel', () => {
      const doc = { fields: [{ field: 'message', value: ['hello'] }] };

      const elements = render(
        <LogAIAssistant doc={doc} observabilityAIAssistant={observabilityAIAssistant} />
      );

      expect(elements.container.getElementsByClassName('euiFlexGroup').length).toBe(1);
    });
  });

  describe('when an alternate message field is present', () => {
    it('shows the assistant panel', () => {
      const doc = { fields: [{ field: 'exception.message', value: ['hello'] }] };

      const elements = render(
        <LogAIAssistant doc={doc} observabilityAIAssistant={observabilityAIAssistant} />
      );

      expect(elements.container.getElementsByClassName('euiFlexGroup').length).toBe(1);
    });
  });
});
