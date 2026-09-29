/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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
import { clearSidebarRuntimeContext, setSidebarRuntimeContext } from './sidebar';
import { AgentBuilderAccessChecker } from './services';

vi.mock('./services/access', async () => {
      const mocked = {
      ...(await vi.importActual('./services/access')),
      AgentBuilderAccessChecker: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const MockAgentBuilderAccessChecker = vi.mocked(AgentBuilderAccessChecker);

vi.mock('@kbn/shared-ux-utility', () => {
      const mocked = {
      dynamic: vi.fn(() => () => null),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services', () => {
      const mocked = {
      AgentService: vi.fn(),
      AttachmentsService: vi.fn(() => ({ addAttachmentType: vi.fn() })),
      RenderersService: vi.fn(() => ({ register: vi.fn() })),
      ConversationEventsService: vi.fn(() => ({
        register: vi.fn(),
        getUiDefinition: vi.fn(),
        has: vi.fn(),
        list: vi.fn().mockReturnValue([]),
      })),
      ChatService: vi.fn(),
      ConversationsService: vi.fn(),
      ConversationTemplatesService: vi.fn(() => ({
        registerTab: vi.fn(),
        getTab: vi.fn(),
        registerTemplateUIDefinition: vi.fn(),
        getTemplateUIDefinition: vi.fn(),
      })),
      DocLinksService: vi.fn(),
      NavigationService: vi.fn(),
      ToolsService: vi.fn(),
      SkillsService: vi.fn(),
      SmlService: vi.fn(),
      OAuthClientsService: vi.fn(),
      PluginsService: vi.fn(),
      EventsService: vi.fn(),
      SpaceSettingsService: vi.fn(),
      AgentBuilderAccessChecker: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services/attachments', () => {
      const mocked = {
      createPublicAttachmentContract: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services/conversation_templates', () => {
      const mocked = {
      createPublicConversationTemplatesContract: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services/renderers', () => {
      const mocked = {
      createPublicRenderersContract: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services/conversation_events', () => {
      const mocked = {
      createPublicConversationEventsContract: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services/tools', () => {
      const mocked = {
      createPublicToolContract: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services/agents', () => {
      const mocked = {
      createPublicAgentsContract: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./services/events', () => {
      const mocked = {
      createPublicEventsContract: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./register', () => {
      const mocked = {
      registerApp: vi.fn(),
      registerAnalytics: vi.fn(),
      buildAgentBuilderDeepLinks: vi.fn(() => []),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./locator/register_locators', () => {
      const mocked = {
      registerLocators: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./step_types', () => {
      const mocked = {
      registerWorkflowSteps: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./sidebar', () => {
      const mocked = {
      setSidebarServices: vi.fn(),
      setSidebarRuntimeContext: vi.fn(),
      clearSidebarRuntimeContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/nav_control/lazy_agent_builder_nav_control', () => {
      const mocked = {
      AgentBuilderNavControlInitiator: () => null,
    };
      return { ...mocked, default: mocked };
    });

const createMockInitializerContext = (): PluginInitializerContext<ConfigSchema> =>
  ({
    logger: {
      get: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
    },
  } as unknown as PluginInitializerContext<ConfigSchema>);

const createMockSidebarApp = () => {
  const isOpen$ = new BehaviorSubject(false);

  return {
    open: vi.fn(() => {
      isOpen$.next(true);
    }),
    close: vi.fn(() => {
      isOpen$.next(false);
    }),
    isOpen: vi.fn(() => isOpen$.getValue()),
    isOpen$: vi.fn(() => isOpen$),
    setIsOpen: (nextIsOpen: boolean) => {
      isOpen$.next(nextIsOpen);
    },
  };
};

const createMockCoreSetup = (): CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart> =>
  ({
    analytics: { reportEvent: vi.fn() },
    chrome: {
      sidebar: { registerApp: vi.fn() },
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
      sidebar: { getApp: vi.fn(() => sidebarApp) },
      controls: { aiButton: { register: vi.fn() } },
    },
    uiSettings: {
      get$: vi.fn(() => new BehaviorSubject(false)),
    },
    analytics: { reportEvent: vi.fn() },
  } as unknown as CoreStart);

const createMockSetupDeps = (): AgentBuilderSetupDependencies =>
  ({
    actions: { isEarsEnabled: false, isEarsExperimentalEnabled: false },
    management: { locator: {} },
    licenseManagement: undefined,
    share: {},
    workflowsExtensions: {},
    files: { registerFileKind: vi.fn() },
  } as unknown as AgentBuilderSetupDependencies);

const createMockStartDeps = (): AgentBuilderStartDependencies =>
  ({
    licensing: {},
    inference: {},
    files: { filesClientFactory: { asScoped: vi.fn().mockReturnValue({}) } },
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
  mocks: { updateProps?: Mock } = {}
) => {
  start.openChat({});
  const [sidebarCtx] = vi.mocked(setSidebarRuntimeContext).mock.calls[0];
  const mockUpdateProps = mocks.updateProps ?? vi.fn();
  sidebarCtx.onRegisterCallbacks?.({
    updateProps: mockUpdateProps,
    resetBrowserApiTools: vi.fn(),
    addAttachment: vi.fn(),
    removeAttachmentById: vi.fn(),
  });
  return { mockUpdateProps };
};

describe('AgentBuilderPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockAgentBuilderAccessChecker.mockImplementation(
      () =>
        ({
          getAgentBuilderAccess: vi.fn().mockResolvedValue({
            hasRequiredLicense: true,
            hasLlmConnector: true,
          }),
        } as unknown as AgentBuilderAccessChecker)
    );
  });

  describe('getAgentBuilderAccess', () => {
    it('delegates to accessChecker.getAgentBuilderAccess when show privilege is granted', async () => {
      const getAgentBuilderAccess = vi.fn().mockResolvedValue({
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
      const getAgentBuilderAccess = vi.fn();
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
      const getAgentBuilderAccess = vi.fn().mockResolvedValue({
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

  describe('when another sidebar app replaces Agent Builder', () => {
    it('opens on the first toggle', () => {
      const sidebarApp = createMockSidebarApp();
      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(createMockCoreStart(sidebarApp), createMockStartDeps());

      start.openChat();
      sidebarApp.setIsOpen(false);
      start.toggleChat();

      expect(sidebarApp.open).toHaveBeenCalledTimes(2);
      expect(sidebarApp.close).not.toHaveBeenCalled();
    });

    it('clears runtime state when another sidebar app replaces Agent Builder', () => {
      const sidebarApp = createMockSidebarApp();
      const plugin = new AgentBuilderPlugin(createMockInitializerContext());
      plugin.setup(createMockCoreSetup(), createMockSetupDeps());
      const start = plugin.start(createMockCoreStart(sidebarApp), createMockStartDeps());
      const { mockUpdateProps } = openSidebarAndRegisterCallbacks(start);
      vi.mocked(clearSidebarRuntimeContext).mockClear();

      sidebarApp.setIsOpen(false);
      start.setChatConfig({ newConversation: true });

      expect(clearSidebarRuntimeContext).toHaveBeenCalledTimes(1);
      expect(mockUpdateProps).not.toHaveBeenCalled();
    });
  });
});
