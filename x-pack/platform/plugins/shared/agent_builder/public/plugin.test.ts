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
import { AgentBuilderAccessChecker } from './services';

jest.mock('./services/access', () => ({
  ...jest.requireActual('./services/access'),
  AgentBuilderAccessChecker: jest.fn(),
}));

const MockAgentBuilderAccessChecker = jest.mocked(AgentBuilderAccessChecker);

jest.mock('@kbn/shared-ux-utility', () => ({
  dynamic: jest.fn(() => () => null),
}));

jest.mock('./services', () => ({
  AgentService: jest.fn(),
  AttachmentsService: jest.fn(() => ({ addAttachmentType: jest.fn() })),
  RenderersService: jest.fn(() => ({ register: jest.fn() })),
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

jest.mock('./services/renderers', () => ({
  createPublicRenderersContract: jest.fn(() => ({})),
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
      capabilities: {
        navLinks: {},
        management: {},
        catalogue: {},
        agentBuilder: { show: false },
      },
    },
    chrome: {
      sidebar: { getApp: jest.fn(() => sidebarApp) },
      navControls: { registerRight: jest.fn() },
      next: { aiButton: { register: jest.fn() } },
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
  mocks: { updateProps?: jest.Mock } = {}
) => {
  start.openChat({});
  const [sidebarCtx] = jest.mocked(setSidebarRuntimeContext).mock.calls[0];
  const mockUpdateProps = mocks.updateProps ?? jest.fn();
  sidebarCtx.onRegisterCallbacks?.({
    updateProps: mockUpdateProps,
    resetBrowserApiTools: jest.fn(),
    addAttachment: jest.fn(),
  });
  return { mockUpdateProps };
};

describe('AgentBuilderPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockAgentBuilderAccessChecker.mockImplementation(
      () =>
        ({
          getAgentBuilderAccess: jest.fn().mockResolvedValue({
            hasRequiredLicense: true,
            hasLlmConnector: true,
          }),
        } as unknown as AgentBuilderAccessChecker)
    );
  });

  describe('getAgentBuilderAccess', () => {
    it('delegates to accessChecker.getAgentBuilderAccess when show privilege is granted', async () => {
      const getAgentBuilderAccess = jest.fn().mockResolvedValue({
        hasRequiredLicense: true,
        hasLlmConnector: true,
      });
      MockAgentBuilderAccessChecker.mockImplementation(
        () => ({ getAgentBuilderAccess } as unknown as AgentBuilderAccessChecker)
      );

      const sidebarApp = createMockSidebarApp();
      const coreStart = createMockCoreStart(sidebarApp);
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        agentBuilder: { show: true },
      };

      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(coreStart, createMockStartDeps());

      await expect(start.getAgentBuilderAccess()).resolves.toEqual({
        hasRequiredLicense: true,
        hasLlmConnector: true,
      });

      expect(getAgentBuilderAccess).toHaveBeenCalled();
    });

    it('returns denied access without calling getAgentBuilderAccess when show privilege is missing', async () => {
      const getAgentBuilderAccess = jest.fn();
      MockAgentBuilderAccessChecker.mockImplementation(
        () => ({ getAgentBuilderAccess } as unknown as AgentBuilderAccessChecker)
      );

      const sidebarApp = createMockSidebarApp();
      const coreStart = createMockCoreStart(sidebarApp);
      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(coreStart, createMockStartDeps());

      await expect(start.getAgentBuilderAccess()).resolves.toEqual({
        hasRequiredLicense: false,
        hasLlmConnector: false,
      });

      expect(getAgentBuilderAccess).not.toHaveBeenCalled();
    });

    it('returns denied access when accessChecker.getAgentBuilderAccess resolves denied', async () => {
      const getAgentBuilderAccess = jest.fn().mockResolvedValue({
        hasRequiredLicense: false,
        hasLlmConnector: false,
      });
      MockAgentBuilderAccessChecker.mockImplementation(
        () => ({ getAgentBuilderAccess } as unknown as AgentBuilderAccessChecker)
      );

      const sidebarApp = createMockSidebarApp();
      const coreStart = createMockCoreStart(sidebarApp);
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        agentBuilder: { show: true },
      };

      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(coreStart, createMockStartDeps());

      await expect(start.getAgentBuilderAccess()).resolves.toEqual({
        hasRequiredLicense: false,
        hasLlmConnector: false,
      });

      expect(getAgentBuilderAccess).toHaveBeenCalled();
    });
  });

  describe('openChat when sidebar is already open', () => {
    it('should call updateProps with the new config when the sidebar is already open', () => {
      const sidebarApp = createMockSidebarApp();
      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(createMockCoreStart(sidebarApp), createMockStartDeps());

      const { mockUpdateProps } = openSidebarAndRegisterCallbacks(start);
      const mockGroup = createMockAttachmentGroup();

      start.openChat({ newConversation: true, attachments: [mockGroup] });

      expect(mockUpdateProps).toHaveBeenCalledTimes(1);
      expect(mockUpdateProps).toHaveBeenCalledWith({
        newConversation: true,
        attachments: [mockGroup],
      });
    });
  });
});
