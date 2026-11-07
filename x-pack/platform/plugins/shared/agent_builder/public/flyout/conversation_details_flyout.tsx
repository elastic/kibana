/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { FlyoutTemplate } from '@kbn/flyout-template';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { Conversation } from '@kbn/agent-builder-common';
import type {
  ConversationTemplateDetailsFlyoutDescriptor,
  ConversationTemplateDetailsFlyoutModule,
  ConversationTemplateDetailsFlyoutRenderProps,
  ConversationTemplateTabDefinition,
} from '@kbn/agent-builder-browser';
import {
  BUILTIN_TAB_IDS,
  CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
} from '@kbn/agent-builder-browser';
import type { ConversationsService } from '../services/conversations/conversations_service';
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { useConversation } from '../application/hooks/use_conversation';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';
import { useConversationFlyoutWidthProps } from './conversation_details_flyout_width';

export const FLYOUT_TITLE = i18n.translate('xpack.agentBuilder.conversationDetailsFlyout.title', {
  defaultMessage: 'Summary',
});

const ERROR_BODY = i18n.translate('xpack.agentBuilder.conversationDetailsFlyout.errorBody', {
  defaultMessage: 'Something went wrong while loading this conversation.',
});

const TAB_BAR_LABEL = i18n.translate('xpack.agentBuilder.conversationDetailsFlyout.tabBarLabel', {
  defaultMessage: 'Summary tabs',
});

/**
 * Zone test subjects, set explicitly so they are the same in both hosts. Derived ones would carry
 * the host's root subject (`-live` or `-snapshot`).
 */
const TEST_SUBJ = {
  header: 'agentBuilderConversationDetailsFlyoutHeader',
  body: 'agentBuilderConversationDetailsFlyoutBody',
  footer: 'agentBuilderConversationDetailsFlyoutFooter',
  tabBar: 'agentBuilderConversationDetailsFlyoutTabs',
  tab: (tabId: string) => `agentBuilderConversationDetailsFlyoutTab-${tabId}`,
};

const POLL_INTERVAL_MS = 5_000;

const isNotFoundError = (error: IHttpFetchError | null): boolean => error?.response?.status === 404;

type ResolvedTab = ConversationTemplateTabDefinition & { id: string };

const buildTabs = (
  conversation: Conversation,
  conversationTemplatesService: ConversationTemplatesService
): ResolvedTab[] => {
  const definition = conversation.template_id
    ? conversationTemplatesService.getTemplateUIDefinition(conversation.template_id)
    : undefined;

  const builtinTabIds: readonly string[] = BUILTIN_TAB_IDS;
  const templateTabIds = (definition?.tabs ?? []).filter((id) => !builtinTabIds.includes(id));
  const tabIds = [...templateTabIds, ...builtinTabIds];

  return tabIds.flatMap((id) => {
    const tab = conversationTemplatesService.getTab(id);
    return tab ? [{ id, ...tab }] : [];
  });
};

const LoadingDeclaration = ({ onClose }: { onClose: () => void }) => (
  <FlyoutTemplate onClose={onClose}>
    <FlyoutTemplate.Header title={FLYOUT_TITLE} isLoading data-test-subj={TEST_SUBJ.header} />
    <FlyoutTemplate.Body data-test-subj={TEST_SUBJ.body} />
  </FlyoutTemplate>
);

const ErrorDeclaration = ({ onClose }: { onClose: () => void }) => (
  <FlyoutTemplate onClose={onClose}>
    <FlyoutTemplate.Header title={FLYOUT_TITLE} data-test-subj={TEST_SUBJ.header} />
    <FlyoutTemplate.Body data-test-subj={TEST_SUBJ.body}>
      <FlyoutTemplate.Body.Callout level="danger" title={ERROR_BODY} />
    </FlyoutTemplate.Body>
  </FlyoutTemplate>
);

interface DetailsTemplateProps extends ConversationTemplateDetailsFlyoutRenderProps {
  descriptor: ConversationTemplateDetailsFlyoutDescriptor | undefined;
  tabs: ResolvedTab[];
  selectedTabId: string | undefined;
  onTabChange: (tabId: string) => void;
  onClose: () => void;
}

/** The flyout's parts: the template's header and footer, and the conversation's tabs. */
const DetailsTemplate = ({
  descriptor,
  tabs,
  selectedTabId,
  onTabChange,
  onClose,
  ...renderProps
}: DetailsTemplateProps) => {
  const header = descriptor?.header ?? { title: FLYOUT_TITLE };
  const footer = descriptor?.footer;
  const hasTabBar = tabs.length > 1;
  const SingleTabContent = tabs[0]?.content;

  return (
    <FlyoutTemplate
      onClose={onClose}
      {...(hasTabBar
        ? {
            tabs: tabs.map(({ id, label }) => ({ id, label, 'data-test-subj': TEST_SUBJ.tab(id) })),
            tabBarProps: { 'aria-label': TAB_BAR_LABEL, 'data-test-subj': TEST_SUBJ.tabBar },
            selectedTabId,
            onTabChange,
          }
        : {})}
    >
      <FlyoutTemplate.Header
        title={header.title}
        description={header.description}
        isLoading={header.isLoading}
        loadingLabel={header.loadingLabel}
        data-test-subj={TEST_SUBJ.header}
      >
        {header.metaBlocks?.map((block, index) => (
          <FlyoutTemplate.Header.MetaBlock key={block.id ?? index} {...block} />
        ))}
        {header.badges?.map((badge, index) => (
          <FlyoutTemplate.Header.Badge key={badge.id ?? index} {...badge} />
        ))}
        {header.infoBlocks?.map((block, index) => (
          <FlyoutTemplate.Header.InfoBlock key={block.id ?? index} {...block} />
        ))}
      </FlyoutTemplate.Header>
      <FlyoutTemplate.Body data-test-subj={TEST_SUBJ.body}>
        {hasTabBar
          ? tabs.map(({ id, content: TabContent }) => (
              <FlyoutTemplate.Body.TabPanel key={id} tabId={id}>
                <TabContent {...renderProps} />
              </FlyoutTemplate.Body.TabPanel>
            ))
          : SingleTabContent && <SingleTabContent {...renderProps} />}
      </FlyoutTemplate.Body>
      {(footer?.primary || footer?.secondary) && (
        <FlyoutTemplate.Footer data-test-subj={TEST_SUBJ.footer}>
          {footer.secondary && <FlyoutTemplate.Footer.SecondaryAction {...footer.secondary} />}
          {footer.primary && <FlyoutTemplate.Footer.PrimaryAction {...footer.primary} />}
        </FlyoutTemplate.Footer>
      )}
    </FlyoutTemplate>
  );
};

type DetailsLoader = () => Promise<ConversationTemplateDetailsFlyoutModule>;
type LoadedDetailsProps = Omit<DetailsTemplateProps, 'descriptor'>;

const loadedDetailsByLoader = new WeakMap<DetailsLoader, ComponentType<LoadedDetailsProps>>();

/**
 * One lazy component per template loader, so the module loads the first time a flyout for the
 * template opens and every later open renders it straight away.
 */
const getLoadedDetails = (load: DetailsLoader): ComponentType<LoadedDetailsProps> => {
  const cached = loadedDetailsByLoader.get(load);
  if (cached) {
    return cached;
  }
  const LoadedDetails = React.lazy(async () => {
    const { useDetailsFlyout, Provider } = await load();
    const Details = ({
      conversation,
      isOpenedFromChat,
      refetchConversation,
      ...rest
    }: LoadedDetailsProps) => {
      const descriptor = useDetailsFlyout({ conversation, isOpenedFromChat, refetchConversation });
      return (
        <DetailsTemplate
          descriptor={descriptor}
          conversation={conversation}
          isOpenedFromChat={isOpenedFromChat}
          refetchConversation={refetchConversation}
          {...rest}
        />
      );
    };
    const WithProvider = (props: LoadedDetailsProps) =>
      Provider ? (
        <Provider>
          <Details {...props} />
        </Provider>
      ) : (
        <Details {...props} />
      );
    return { default: WithProvider };
  });
  loadedDetailsByLoader.set(load, LoadedDetails);
  return LoadedDetails;
};

/** Shows the error state when a template's module fails to load or its flyout fails to render. */
class DetailsErrorBoundary extends Component<
  { load: DetailsLoader; onClose: () => void; children: ReactNode },
  { hasError: boolean }
> {
  public state = { hasError: false };

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public componentDidCatch() {
    // React keeps a rejected lazy component rejected, so the next open needs a fresh one. Evicting
    // any earlier, while React retries the render, would start a new load on every retry.
    loadedDetailsByLoader.delete(this.props.load);
  }

  public render() {
    if (this.state.hasError) {
      return <ErrorDeclaration onClose={this.props.onClose} />;
    }
    return this.props.children;
  }
}

export interface ConversationDetailsFlyoutContentProps {
  isOpenedFromChat: boolean;
  conversation: Conversation;
  conversationTemplatesService: ConversationTemplatesService;
  refetchConversation?: () => Promise<void>;
  onClose: () => void;
}

/** Presentational only — renders whatever conversation it is given; not responsible for data fetching. */
export const ConversationDetailsFlyoutContent = ({
  isOpenedFromChat,
  conversation,
  conversationTemplatesService,
  refetchConversation,
  onClose,
}: ConversationDetailsFlyoutContentProps) => {
  const [selectedTabId, setSelectedTabId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedTabId(undefined);
  }, [conversation.id]);

  const tabs = useMemo(
    () => buildTabs(conversation, conversationTemplatesService),
    [conversation, conversationTemplatesService]
  );
  const effectiveSelectedTabId = selectedTabId ?? tabs[0]?.id;
  const definition = conversation.template_id
    ? conversationTemplatesService.getTemplateUIDefinition(conversation.template_id)
    : undefined;
  const detailsFlyout = definition?.detailsFlyout;
  const renderProps = { conversation, isOpenedFromChat, refetchConversation };

  if (detailsFlyout?.load) {
    const LoadedDetails = getLoadedDetails(detailsFlyout.load);
    return (
      <DetailsErrorBoundary key={conversation.id} load={detailsFlyout.load} onClose={onClose}>
        <LoadedDetails
          {...renderProps}
          tabs={tabs}
          selectedTabId={effectiveSelectedTabId}
          onTabChange={setSelectedTabId}
          onClose={onClose}
        />
      </DetailsErrorBoundary>
    );
  }

  if (tabs.length === 0) {
    return <ErrorDeclaration onClose={onClose} />;
  }

  return (
    <DetailsTemplate
      descriptor={undefined}
      {...renderProps}
      tabs={tabs}
      selectedTabId={effectiveSelectedTabId}
      onTabChange={setSelectedTabId}
      onClose={onClose}
    />
  );
};

export interface ConversationDetailsFlyoutSnapshotProps {
  conversationId: string;
  conversationsService: ConversationsService;
  conversationTemplatesService: ConversationTemplatesService;
  onNotFound?: () => void;
  onClose: () => void;
}

/**
 * Snapshot variant backed by an isolated, per-open query cache. Opened outside chat, where nothing
 * else invalidates the conversation, so it polls while open and hands registered content a way to
 * refetch on demand.
 */
export const ConversationDetailsFlyoutSnapshot = ({
  conversationId,
  conversationsService,
  conversationTemplatesService,
  onNotFound,
  onClose,
}: ConversationDetailsFlyoutSnapshotProps) => {
  const {
    data: conversation,
    error,
    isLoading,
    refetch,
  } = useQuery<Conversation, IHttpFetchError>({
    queryKey: ['conversation-details-flyout-snapshot', conversationId],
    queryFn: () => conversationsService.get({ conversationId }),
    retry: (failureCount, httpError) => !isNotFoundError(httpError) && failureCount < 3,
    refetchInterval: (data, query) =>
      isNotFoundError(query.state.error) ? false : POLL_INTERVAL_MS,
  });

  const isNotFound = isNotFoundError(error);
  useEffect(() => {
    if (isNotFound) {
      onNotFound?.();
    }
  }, [isNotFound, onNotFound]);

  const refetchConversation = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (isLoading) {
    return <LoadingDeclaration onClose={onClose} />;
  }

  if (!conversation) {
    return <ErrorDeclaration onClose={onClose} />;
  }

  return (
    <ConversationDetailsFlyoutContent
      isOpenedFromChat={false}
      conversation={conversation}
      conversationTemplatesService={conversationTemplatesService}
      refetchConversation={refetchConversation}
      onClose={onClose}
    />
  );
};

export interface ConversationDetailsFlyoutProps {
  onClose: () => void;
}

/** Live variant backed by the active conversation cache. */
export const ConversationDetailsFlyout = ({ onClose }: ConversationDetailsFlyoutProps) => {
  const { conversation, isLoading } = useConversation();
  const { conversationTemplatesService } = useAgentBuilderServices();
  const widthProps = useConversationFlyoutWidthProps();

  const trailingActions = useMemo(() => {
    if (!conversation?.template_id) {
      return undefined;
    }
    const definition = conversationTemplatesService.getTemplateUIDefinition(
      conversation.template_id
    );
    return definition?.detailsFlyout?.trailingActions?.({ conversation });
  }, [conversation, conversationTemplatesService]);

  let content: ReactNode;
  if (conversation) {
    content = (
      <ConversationDetailsFlyoutContent
        isOpenedFromChat
        conversation={conversation}
        conversationTemplatesService={conversationTemplatesService}
        onClose={onClose}
      />
    );
  } else if (isLoading) {
    content = <LoadingDeclaration onClose={onClose} />;
  } else {
    content = <ErrorDeclaration onClose={onClose} />;
  }

  return (
    <FlyoutTemplate.Frame
      onClose={onClose}
      session="start"
      historyKey={CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY}
      flyoutMenuProps={{ title: FLYOUT_TITLE, trailingActions }}
      {...widthProps}
      type="push"
      role="region"
      data-test-subj="agentBuilderConversationDetailsFlyout-live"
    >
      {content}
    </FlyoutTemplate.Frame>
  );
};
