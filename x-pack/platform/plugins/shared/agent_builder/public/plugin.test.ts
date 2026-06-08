/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { AttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { AgentBuilderPlugin } from './plugin';
import type {
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
  ConfigSchema,
} from './types';
import { setSidebarRuntimeContext } from './sidebar';

jest.mock('@kbn/shared-ux-utility', () => ({
  dynamic: jest.fn(() => () => null),
}));

jest.mock('./services', () => ({
  AgentService: jest.fn(),
  AttachmentsService: jest.fn(() => ({ addAttachmentType: jest.fn() })),
  ChatService: jest.fn(),
  ConversationsService: jest.fn(),
  DocLinksService: jest.fn(),
  NavigationService: jest.fn(),
  ToolsService: jest.fn(),
  SkillsService: jest.fn(),
  SmlService: jest.fn(),
  OAuthClientsService: jest.fn(),
  PluginsService: jest.fn(),
  EventsService: jest.fn(),
  AgentBuilderAccessChecker: jest.fn(),
}));

jest.mock('./services/attachments', () => ({
  createPublicAttachmentContract: jest.fn(() => ({})),
}));

jest.mock('./services/tools', () => ({
  createPublicToolContract: jest.fn(() => ({})),
}));

jest.mock('./services/agents', () => ({
  createPublicAgentsContract: jest.fn(() => ({})),
}));

jest.mock('./services/events', () => ({
  createPublicEventsContract: jest.fn(() => ({})),
}));

jest.mock('./register', () => ({
  registerApp: jest.fn(),
  registerAnalytics: jest.fn(),
  buildAgentBuilderDeepLinks: jest.fn(() => []),
}));

jest.mock('./locator/register_locators', () => ({
  registerLocators: jest.fn(),
}));

jest.mock('./step_types', () => ({
  registerWorkflowSteps: jest.fn(),
}));

jest.mock('./sidebar', () => ({
  setSidebarServices: jest.fn(),
  setSidebarRuntimeContext: jest.fn(),
  clearSidebarRuntimeContext: jest.fn(),
}));

jest.mock('./application/components/attachments/visualization_attachment', () => ({
  createVisualizationAttachmentDefinition: jest.fn(() => ({})),
}));

jest.mock('./components/nav_control/lazy_agent_builder_nav_control', () => ({
  AgentBuilderNavControlInitiator: () => null,
}));

const createMockInitializerContext = (): PluginInitializerContext<ConfigSchema> =>
  ({
    logger: {
      get: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      })),
    },
  } as unknown as PluginInitializerContext<ConfigSchema>);

const createMockSidebarApp = () => ({ open: jest.fn(), close: jest.fn() });

const createMockCoreSetup = (): CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart> =>
  ({
    analytics: { reportEvent: jest.fn() },
    chrome: {
      sidebar: { registerApp: jest.fn() },
    },
  } as unknown as CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>);

const createMockCoreStart = (sidebarApp: ReturnType<typeof createMockSidebarApp>): CoreStart =>
  ({
    http: {},
    docLinks: { links: {} },
    application: {
      capabilities: { agentBuilder: { show: false } },
    },
    chrome: {
      sidebar: { getApp: jest.fn(() => sidebarApp) },
    },
    uiSettings: {
      get$: jest.fn(() => new BehaviorSubject(false)),
    },
    analytics: { reportEvent: jest.fn() },
  } as unknown as CoreStart);

const createMockSetupDeps = (): AgentBuilderSetupDependencies =>
  ({
    actions: { isEarsEnabled: false, isEarsExperimentalEnabled: false },
    management: { locator: {} },
    licenseManagement: undefined,
    share: {},
    workflowsExtensions: {},
  } as unknown as AgentBuilderSetupDependencies);

const createMockStartDeps = (): AgentBuilderStartDependencies =>
  ({
    licensing: {},
    inference: {},
  } as unknown as AgentBuilderStartDependencies);

const createMockAttachmentGroup = (overrides: Partial<AttachmentGroup> = {}): AttachmentGroup => ({
  type: 'group',
  id: 'test-group',
  label: '5 Alerts',
  items: [],
  ...overrides,
});

const openSidebarAndRegisterCallbacks = (
  start: AgentBuilderPluginStart,
  mocks: {
    addAttachment?: jest.Mock;
    setInputMessage?: jest.Mock;
    updateProps?: jest.Mock;
  } = {}
) => {
  start.openChat({});
  const [sidebarCtx] = jest.mocked(setSidebarRuntimeContext).mock.calls[0];
  const mockAddAttachment = mocks.addAttachment ?? jest.fn();
  const mockSetInputMessage = mocks.setInputMessage ?? jest.fn();
  const mockUpdateProps = mocks.updateProps ?? jest.fn();
  sidebarCtx.onRegisterCallbacks?.({
    addAttachment: mockAddAttachment,
    setInputMessage: mockSetInputMessage,
    updateProps: mockUpdateProps,
    resetBrowserApiTools: jest.fn(),
  });
  return { mockAddAttachment, mockSetInputMessage, mockUpdateProps };
};

describe('AgentBuilderPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openChat when sidebar is already open', () => {
    it('should append attachments to the existing conversation instead of forcing a new one', () => {
      // Given
      const sidebarApp = createMockSidebarApp();
      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(createMockCoreStart(sidebarApp), createMockStartDeps());

      const { mockAddAttachment, mockUpdateProps } = openSidebarAndRegisterCallbacks(start);
      const mockGroup = createMockAttachmentGroup();

      // When — bulk-add alerts while sidebar is open
      start.openChat({ newConversation: true, attachments: [mockGroup] });

      // Then
      expect(mockAddAttachment).toHaveBeenCalledTimes(1);
      expect(mockAddAttachment).toHaveBeenCalledWith(mockGroup);
      expect(mockUpdateProps).not.toHaveBeenCalled();
    });

    it('should call addAttachment once per attachment when multiple attachments are passed', () => {
      // Given
      const sidebarApp = createMockSidebarApp();
      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(createMockCoreStart(sidebarApp), createMockStartDeps());

      const { mockAddAttachment } = openSidebarAndRegisterCallbacks(start);
      const firstGroup = createMockAttachmentGroup({ id: 'group-1', label: '3 Alerts' });
      const secondGroup = createMockAttachmentGroup({ id: 'group-2', label: '2 Alerts' });

      // When
      start.openChat({ newConversation: true, attachments: [firstGroup, secondGroup] });

      // Then
      expect(mockAddAttachment).toHaveBeenCalledTimes(2);
      expect(mockAddAttachment).toHaveBeenNthCalledWith(1, firstGroup);
      expect(mockAddAttachment).toHaveBeenNthCalledWith(2, secondGroup);
    });

    it('should call setInputMessage with the initialMessage to pre-populate the input rather than starting a new conversation', () => {
      // Given — "Add to chat" from a rule flyout passes attachments + a predefined prompt
      const sidebarApp = createMockSidebarApp();
      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(createMockCoreStart(sidebarApp), createMockStartDeps());

      const { mockSetInputMessage, mockUpdateProps } = openSidebarAndRegisterCallbacks(start);
      const mockGroup = createMockAttachmentGroup();

      // When
      start.openChat({
        newConversation: true,
        attachments: [mockGroup],
        initialMessage: 'Analyze this rule',
      });

      // Then — message goes into the input of the existing conversation, not a new one
      expect(mockSetInputMessage).toHaveBeenCalledWith('Analyze this rule');
      expect(mockUpdateProps).not.toHaveBeenCalled();
    });
  });
});
