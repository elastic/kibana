/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createActionPolicyAttachmentDefinition } from './action_policy_attachment_definition';

jest.mock('./action_policy_inline_content', () => ({
  ActionPolicyInlineContent: () => <div data-test-subj="mockInlineContent" />,
}));

jest.mock('./action_policy_canvas_content', () => ({
  ActionPolicyCanvasContent: () => <div data-test-subj="mockCanvasContent" />,
}));

const createMockServices = () => ({
  container: {} as any,
});

const createAttachment = (overrides: { origin?: string } = {}) => ({
  id: 'att-1',
  type: 'action_policy' as const,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  data: {
    name: 'My Policy',
    description: 'A test policy',
    destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
  } as any,
});

describe('createActionPolicyAttachmentDefinition', () => {
  describe('getLabel', () => {
    it('returns the policy name', () => {
      const definition = createActionPolicyAttachmentDefinition(createMockServices());
      expect(definition.getLabel(createAttachment())).toBe('My Policy');
    });

    it('falls back to Action Policy when name is missing', () => {
      const definition = createActionPolicyAttachmentDefinition(createMockServices());
      const attachment = createAttachment();
      attachment.data.name = undefined;
      expect(definition.getLabel(attachment)).toBe('Action Policy');
    });
  });

  describe('getIcon', () => {
    it('returns pagesSelect', () => {
      const definition = createActionPolicyAttachmentDefinition(createMockServices());
      expect(definition.getIcon!()).toBe('pagesSelect');
    });
  });

  describe('getActionButtons', () => {
    it('returns Preview button when not in canvas', () => {
      const definition = createActionPolicyAttachmentDefinition(createMockServices());
      const buttons = definition.getActionButtons!({
        attachment: createAttachment(),
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        openCanvas: jest.fn(),
      });
      expect(buttons.find((b) => b.label === 'Preview')).toBeDefined();
    });

    it('returns empty array when in canvas', () => {
      const definition = createActionPolicyAttachmentDefinition(createMockServices());
      const buttons = definition.getActionButtons!({
        attachment: createAttachment(),
        isSidebar: false,
        isCanvas: true,
        updateOrigin: jest.fn(),
      });
      expect(buttons).toHaveLength(0);
    });
  });

  describe('renderInlineContent', () => {
    it('renders the inline content component', () => {
      const definition = createActionPolicyAttachmentDefinition(createMockServices());
      const { getByTestId } = render(
        <>{definition.renderInlineContent!({ attachment: createAttachment(), isSidebar: false })}</>
      );
      expect(getByTestId('mockInlineContent')).toBeDefined();
    });
  });

  describe('renderCanvasContent', () => {
    it('renders the canvas content component', () => {
      const definition = createActionPolicyAttachmentDefinition(createMockServices());
      const { getByTestId } = render(
        <>
          {definition.renderCanvasContent!(
            { attachment: createAttachment(), isSidebar: false },
            {
              registerActionButtons: jest.fn(),
              updateOrigin: jest.fn(),
              closeCanvas: jest.fn(),
            }
          )}
        </>
      );
      expect(getByTestId('mockCanvasContent')).toBeDefined();
    });
  });
});
