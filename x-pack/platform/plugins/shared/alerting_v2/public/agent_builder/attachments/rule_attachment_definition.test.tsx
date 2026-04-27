/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createRuleAttachmentDefinition } from './rule_attachment_definition';

jest.mock('@kbn/core-di-browser', () => ({
  Context: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  useService: () => ({}),
  CoreStart: (key: string) => key,
}));

jest.mock('../../components/rule_details/rule_context', () => ({
  RuleProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../components/rule_details/rule_header_description', () => ({
  RuleHeaderDescription: () => <div data-test-subj="mockRuleHeaderDescription" />,
}));

jest.mock('../../components/rule_details/sidebar/rule_sidebar', () => ({
  RuleSidebar: () => <div data-test-subj="mockRuleSidebar" />,
}));

const createMockServices = () => ({
  rulesApi: {
    createRule: jest.fn().mockResolvedValue({ id: 'new-rule-id' }),
    updateRule: jest.fn().mockResolvedValue({}),
    getRule: jest.fn().mockResolvedValue({}),
    deleteRule: jest.fn().mockResolvedValue({}),
    bulkEnableRules: jest.fn().mockResolvedValue({}),
    bulkDisableRules: jest.fn().mockResolvedValue({}),
  } as any,
  application: {
    navigateToUrl: jest.fn(),
  } as any,
  basePath: {
    prepend: (path: string) => `/base${path}`,
  } as any,
  notifications: {
    toasts: { addSuccess: jest.fn(), addError: jest.fn() },
  } as any,
  container: {} as any,
});

const createAttachment = (overrides: { origin?: string; enabled?: boolean } = {}) => ({
  id: 'att-1',
  type: 'rule' as const,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  data: {
    kind: 'signal' as const,
    metadata: { name: 'My Rule', tags: ['tag1'], description: 'A test rule' },
    schedule: { every: '5m' },
    time_field: '@timestamp',
    evaluation: { query: { kql: 'host.name: *' } },
    state_transition: null,
    enabled: overrides.enabled,
  } as any,
});

describe('createRuleAttachmentDefinition', () => {
  describe('getLabel', () => {
    it('returns the rule name', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment();

      expect(definition.getLabel(attachment)).toBe('My Rule');
    });
  });

  describe('getIcon', () => {
    it('returns bell', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);

      expect(definition.getIcon!()).toBe('bell');
    });
  });

  describe('getActionButtons', () => {
    it('returns Preview button when not in canvas and openCanvas is provided', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment();

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        openCanvas: jest.fn(),
      });

      expect(buttons.find((b) => b.label === 'Preview')).toBeDefined();
    });

    it('returns empty array when in canvas', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment();

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: true,
        updateOrigin: jest.fn(),
      });

      expect(buttons).toHaveLength(0);
    });
  });

  describe('renderInlineContent', () => {
    it('shows proposed status when no origin', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment();

      const { getByText } = render(
        <>{definition.renderInlineContent!({ attachment, isSidebar: false })}</>
      );

      expect(getByText('proposed')).toBeDefined();
    });

    it('shows enabled status when origin set and enabled is undefined (server default)', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment({ origin: 'rule-123' });

      const { getByText } = render(
        <>{definition.renderInlineContent!({ attachment, isSidebar: false })}</>
      );

      expect(getByText('enabled')).toBeDefined();
    });

    it('shows disabled status when origin set and enabled is false', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment({ origin: 'rule-123', enabled: false });

      const { getByText } = render(
        <>{definition.renderInlineContent!({ attachment, isSidebar: false })}</>
      );

      expect(getByText('disabled')).toBeDefined();
    });

    it('shows schedule interval', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment();

      const { getByText } = render(
        <>{definition.renderInlineContent!({ attachment, isSidebar: false })}</>
      );

      expect(getByText('Every 5m')).toBeDefined();
    });
  });

  describe('renderCanvasContent', () => {
    it('renders sidebar and header description', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment();

      const { getByTestId } = render(
        <>
          {definition.renderCanvasContent!(
            { attachment, isSidebar: false },
            {
              registerActionButtons: jest.fn(),
              updateOrigin: jest.fn(),
              closeCanvas: jest.fn(),
            }
          )}
        </>
      );

      expect(getByTestId('mockRuleSidebar')).toBeDefined();
      expect(getByTestId('mockRuleHeaderDescription')).toBeDefined();
    });

    it('registers Create rule button for unsaved attachment', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment();
      const registerActionButtons = jest.fn();

      render(
        <>
          {definition.renderCanvasContent!(
            { attachment, isSidebar: false },
            {
              registerActionButtons,
              updateOrigin: jest.fn(),
              closeCanvas: jest.fn(),
            }
          )}
        </>
      );

      const buttons =
        registerActionButtons.mock.calls[registerActionButtons.mock.calls.length - 1][0];
      expect(buttons.find((b: { label: string }) => b.label === 'Create rule')).toBeDefined();
      expect(buttons.find((b: { label: string }) => b.label === 'Update Rule')).toBeUndefined();
    });

    it('registers Update Rule and View in Rules buttons for saved attachment', () => {
      const services = createMockServices();
      const definition = createRuleAttachmentDefinition(services);
      const attachment = createAttachment({ origin: 'rule-123' });
      const registerActionButtons = jest.fn();

      render(
        <>
          {definition.renderCanvasContent!(
            { attachment, isSidebar: false },
            {
              registerActionButtons,
              updateOrigin: jest.fn(),
              closeCanvas: jest.fn(),
            }
          )}
        </>
      );

      const buttons =
        registerActionButtons.mock.calls[registerActionButtons.mock.calls.length - 1][0];
      expect(buttons.find((b: { label: string }) => b.label === 'Update Rule')).toBeDefined();
      expect(buttons.find((b: { label: string }) => b.label === 'View in Rules')).toBeDefined();
      expect(buttons.find((b: { label: string }) => b.label === 'Create rule')).toBeUndefined();
    });

    describe('Create rule handler', () => {
      it('calls createRule and updateOrigin with the new rule id', async () => {
        const services = createMockServices();
        const definition = createRuleAttachmentDefinition(services);
        const attachment = createAttachment();
        const registerActionButtons = jest.fn();
        const updateOrigin = jest.fn().mockResolvedValue(undefined);

        render(
          <>
            {definition.renderCanvasContent!(
              { attachment, isSidebar: false },
              {
                registerActionButtons,
                updateOrigin,
                closeCanvas: jest.fn(),
              }
            )}
          </>
        );

        const buttons =
          registerActionButtons.mock.calls[registerActionButtons.mock.calls.length - 1][0];
        const saveButton = buttons.find((b: { label: string }) => b.label === 'Create rule');
        await saveButton.handler();

        expect(services.rulesApi.createRule).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'signal' })
        );
        expect(updateOrigin).toHaveBeenCalledWith('new-rule-id');
      });
    });

    describe('Update Rule handler', () => {
      it('calls updateRule with the rule id', async () => {
        const services = createMockServices();
        const definition = createRuleAttachmentDefinition(services);
        const attachment = createAttachment({ origin: 'rule-123' });
        const registerActionButtons = jest.fn();

        render(
          <>
            {definition.renderCanvasContent!(
              { attachment, isSidebar: false },
              {
                registerActionButtons,
                updateOrigin: jest.fn(),
                closeCanvas: jest.fn(),
              }
            )}
          </>
        );

        const buttons =
          registerActionButtons.mock.calls[registerActionButtons.mock.calls.length - 1][0];
        const updateButton = buttons.find((b: { label: string }) => b.label === 'Update Rule');
        await updateButton.handler();

        expect(services.rulesApi.updateRule).toHaveBeenCalledWith(
          'rule-123',
          expect.objectContaining({ metadata: attachment.data.metadata })
        );
      });
    });

    describe('View in Rules handler', () => {
      it('navigates to the rule detail page', () => {
        const services = createMockServices();
        const definition = createRuleAttachmentDefinition(services);
        const attachment = createAttachment({ origin: 'rule-123' });
        const registerActionButtons = jest.fn();

        render(
          <>
            {definition.renderCanvasContent!(
              { attachment, isSidebar: false },
              {
                registerActionButtons,
                updateOrigin: jest.fn(),
                closeCanvas: jest.fn(),
              }
            )}
          </>
        );

        const buttons =
          registerActionButtons.mock.calls[registerActionButtons.mock.calls.length - 1][0];
        const viewButton = buttons.find((b: { label: string }) => b.label === 'View in Rules');
        viewButton.handler();

        expect(services.application.navigateToUrl).toHaveBeenCalledWith(
          expect.stringContaining('rule-123')
        );
      });
    });
  });
});
