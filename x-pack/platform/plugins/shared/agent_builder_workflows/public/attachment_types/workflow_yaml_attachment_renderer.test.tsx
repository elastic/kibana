/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { QueryClient } from '@kbn/react-query';
import { coreLifecycleMock } from '@kbn/core-lifecycle-browser-mocks';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { createMockWorkflowApi } from '@kbn/workflows-ui/mocks';
import type { WorkflowsBaseTelemetry } from '@kbn/workflows-management-plugin/public';
import { createWorkflowYamlAttachmentUiDefinition } from './workflow_yaml_attachment_renderer';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'test-theme',
}));

const mockWorkflowApi = createMockWorkflowApi();

const allWorkflowCapabilitiesTrue = {
  canCreateWorkflow: true,
  canReadWorkflow: true,
  canUpdateWorkflow: true,
  canDeleteWorkflow: true,
  canExecuteWorkflow: true,
  canReadWorkflowExecution: true,
  canCancelWorkflowExecution: true,
};

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useWorkflowsApi: jest.fn(() => mockWorkflowApi),
    useWorkflowsCapabilities: jest.fn(() => allWorkflowCapabilitiesTrue),
  };
});

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;

const createMockServices = ({
  currentAppId = 'other',
  currentLocation = '/',
}: { currentAppId?: string; currentLocation?: string } = {}) => {
  const core = coreLifecycleMock.createCoreStart();
  core.application.currentAppId$ = new BehaviorSubject<string | undefined>(currentAppId);
  core.application.currentLocation$ = new BehaviorSubject<string>(currentLocation);
  const telemetry = {
    reportWorkflowCreated: jest.fn(),
    reportWorkflowUpdated: jest.fn(),
  } as unknown as WorkflowsBaseTelemetry;
  return {
    core,
    telemetry,
    queryClient: new QueryClient(),
  };
};

const createAttachment = (overrides: Partial<{ workflowId?: string; name?: string }> = {}) => ({
  id: 'att-1',
  type: WORKFLOW_YAML_ATTACHMENT_TYPE,
  versions: [],
  current_version: 1,
  data: {
    yaml: 'version: "1"\nname: Test Workflow\nsteps: []\n',
    workflowId: overrides.workflowId,
    name: overrides.name,
  },
});

describe('createWorkflowYamlAttachmentUiDefinition', () => {
  beforeEach(() => {
    mockUseWorkflowsCapabilities.mockReturnValue(allWorkflowCapabilitiesTrue);
  });

  it('returns an object with the expected shape', () => {
    const services = createMockServices();
    const definition = createWorkflowYamlAttachmentUiDefinition(services);

    expect(definition.getLabel).toBeDefined();
    expect(definition.getIcon).toBeDefined();
    expect(definition.getActionButtons).toBeDefined();
    expect(definition.renderCanvasContent).toBeDefined();
  });

  describe('getLabel', () => {
    it('returns the workflow name when present', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ name: 'My Workflow' });

      expect(definition.getLabel(attachment)).toBe('My Workflow');
    });

    it('returns the default label when name is absent', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      expect(definition.getLabel(attachment)).toBe('Workflow');
    });
  });

  describe('getIcon', () => {
    it('returns the workflows app icon', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);

      expect(definition.getIcon!()).toBe('workflowsApp');
    });
  });

  describe('getActionButtons', () => {
    it('includes Preview button when openCanvas is provided', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        openCanvas: jest.fn(),
      });

      const previewButton = buttons.find((b) => b.label === 'Preview');
      expect(previewButton).toBeDefined();
    });

    it('includes Open in editor button when workflowId is present', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ workflowId: 'wf-123' });

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      });

      const openInEditorButton = buttons.find((b) => b.label === 'Open in editor');
      expect(openInEditorButton).toBeDefined();
    });

    it('does NOT include Open in editor button when workflowId is absent', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      });

      const openInEditorButton = buttons.find((b) => b.label === 'Open in editor');
      expect(openInEditorButton).toBeUndefined();
    });

    it('does NOT include Open in editor button when already on that workflow page', () => {
      const services = createMockServices({
        currentAppId: 'workflows',
        currentLocation: '/wf-123',
      });
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ workflowId: 'wf-123' });

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      });

      const openInEditorButton = buttons.find((b) => b.label === 'Open in editor');
      expect(openInEditorButton).toBeUndefined();
    });

    describe('Open in editor button handler', () => {
      it('calls application.navigateToApp with the workflow ID', () => {
        const services = createMockServices();
        const definition = createWorkflowYamlAttachmentUiDefinition(services);
        const attachment = createAttachment({ workflowId: 'wf-123' });

        const buttons = definition.getActionButtons!({
          attachment,
          isSidebar: false,
          isCanvas: false,
          updateOrigin: jest.fn(),
        });

        const openInEditorButton = buttons.find((b) => b.label === 'Open in editor')!;
        openInEditorButton.handler();

        expect(services.core.application.navigateToApp).toHaveBeenCalledWith('workflows', {
          path: 'wf-123',
        });
      });
    });
  });

  describe('renderCanvasContent', () => {
    it('renders a YAML code editor', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      const { container } = render(
        <>
          {definition.renderCanvasContent!(
            { attachment, isSidebar: false },
            { registerActionButtons: jest.fn(), updateOrigin: jest.fn(), closeCanvas: jest.fn() }
          )}
        </>
      );

      expect(container.querySelector('[data-test-subj="TextBasedLangEditor"]')).toBeDefined();
    });

    it('registers Save button for new workflow', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();
      const registerActionButtons = jest.fn();

      render(
        <>
          {definition.renderCanvasContent!(
            { attachment, isSidebar: false },
            { registerActionButtons, updateOrigin: jest.fn(), closeCanvas: jest.fn() }
          )}
        </>
      );

      const buttons = registerActionButtons.mock.calls[0][0];
      expect(buttons.find((b: { label: string }) => b.label === 'Save')).toBeDefined();
      expect(buttons.find((b: { label: string }) => b.label === 'Override')).toBeUndefined();
    });

    it('registers Override and Save as new buttons for existing workflow', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ workflowId: 'wf-123' });
      const registerActionButtons = jest.fn();

      render(
        <>
          {definition.renderCanvasContent!(
            { attachment, isSidebar: false },
            { registerActionButtons, updateOrigin: jest.fn(), closeCanvas: jest.fn() }
          )}
        </>
      );

      const buttons = registerActionButtons.mock.calls[0][0];
      expect(buttons.find((b: { label: string }) => b.label === 'Override')).toBeDefined();
      expect(buttons.find((b: { label: string }) => b.label === 'Save as new')).toBeDefined();
    });

    it('registers Open in editor button for existing workflow', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ workflowId: 'wf-123' });
      const registerActionButtons = jest.fn();

      render(
        <>
          {definition.renderCanvasContent!(
            { attachment, isSidebar: false },
            { registerActionButtons, updateOrigin: jest.fn(), closeCanvas: jest.fn() }
          )}
        </>
      );

      const buttons = registerActionButtons.mock.calls[0][0];
      expect(buttons.find((b: { label: string }) => b.label === 'Open in editor')).toBeDefined();
    });

    describe('authorization (capabilities)', () => {
      it('omits Save for new workflow when createWorkflow is false', () => {
        mockUseWorkflowsCapabilities.mockReturnValue({
          ...allWorkflowCapabilitiesTrue,
          canCreateWorkflow: false,
        });
        const services = createMockServices();
        const definition = createWorkflowYamlAttachmentUiDefinition(services);
        const attachment = createAttachment();
        const registerActionButtons = jest.fn();

        render(
          <>
            {definition.renderCanvasContent!(
              { attachment, isSidebar: false },
              { registerActionButtons, updateOrigin: jest.fn(), closeCanvas: jest.fn() }
            )}
          </>
        );

        const buttons = registerActionButtons.mock.calls[0][0];
        expect(buttons.find((b: { label: string }) => b.label === 'Save')).toBeUndefined();
      });

      it('omits Override when updateWorkflow is false but keeps Save as new when createWorkflow is true', () => {
        mockUseWorkflowsCapabilities.mockReturnValue({
          ...allWorkflowCapabilitiesTrue,
          canUpdateWorkflow: false,
        });
        const services = createMockServices();
        const definition = createWorkflowYamlAttachmentUiDefinition(services);
        const attachment = createAttachment({ workflowId: 'wf-123' });
        const registerActionButtons = jest.fn();

        render(
          <>
            {definition.renderCanvasContent!(
              { attachment, isSidebar: false },
              { registerActionButtons, updateOrigin: jest.fn(), closeCanvas: jest.fn() }
            )}
          </>
        );

        const buttons = registerActionButtons.mock.calls[0][0];
        expect(buttons.find((b: { label: string }) => b.label === 'Override')).toBeUndefined();
        expect(buttons.find((b: { label: string }) => b.label === 'Save as new')).toBeDefined();
      });

      it('omits Save as new when createWorkflow is false but keeps Override when updateWorkflow is true', () => {
        mockUseWorkflowsCapabilities.mockReturnValue({
          ...allWorkflowCapabilitiesTrue,
          canCreateWorkflow: false,
        });
        const services = createMockServices();
        const definition = createWorkflowYamlAttachmentUiDefinition(services);
        const attachment = createAttachment({ workflowId: 'wf-123' });
        const registerActionButtons = jest.fn();

        render(
          <>
            {definition.renderCanvasContent!(
              { attachment, isSidebar: false },
              { registerActionButtons, updateOrigin: jest.fn(), closeCanvas: jest.fn() }
            )}
          </>
        );

        const buttons = registerActionButtons.mock.calls[0][0];
        expect(buttons.find((b: { label: string }) => b.label === 'Override')).toBeDefined();
        expect(buttons.find((b: { label: string }) => b.label === 'Save as new')).toBeUndefined();
      });

      it('omits Open in editor when readWorkflow is false', () => {
        mockUseWorkflowsCapabilities.mockReturnValue({
          ...allWorkflowCapabilitiesTrue,
          canReadWorkflow: false,
        });
        const services = createMockServices();
        const definition = createWorkflowYamlAttachmentUiDefinition(services);
        const attachment = createAttachment({ workflowId: 'wf-123' });
        const registerActionButtons = jest.fn();

        render(
          <>
            {definition.renderCanvasContent!(
              { attachment, isSidebar: false },
              { registerActionButtons, updateOrigin: jest.fn(), closeCanvas: jest.fn() }
            )}
          </>
        );

        const buttons = registerActionButtons.mock.calls[0][0];
        expect(
          buttons.find((b: { label: string }) => b.label === 'Open in editor')
        ).toBeUndefined();
      });
    });
  });
});
