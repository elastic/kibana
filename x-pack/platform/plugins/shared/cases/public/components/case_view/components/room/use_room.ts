/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { CaseUI } from '../../../../../common/ui/types';
import { useKibana } from '../../../../common/lib/kibana';
import { getCaseAttachment } from '../../../../agent_builder/use_add_case_to_chat';
import { ensureCaseRoom, postFromRoom } from '../../../../containers/agentic_api';
import { casesQueriesKeys } from '../../../../containers/constants';

const AGENT_BUILDER_API_VERSION = '2023-10-31';
const OPEN_KEY = 'cases.room.open';
const POSTED_KEY = (caseId: string) => `cases.room.posted.${caseId}`;
/** Teammates' messages arrive by polling while the room is open. */
const REFRESH_MS = 5000;

/** The `@` mention that addresses the agent. Anything else in the room is team chat. */
export const AGENT_MENTION = '@Elastic AI Agent';

export const mentionsAgent = (text: string) =>
  text.toLowerCase().includes(AGENT_MENTION.toLowerCase());

/** The agent runs only when it is on for the case and the message mentions it. */
export const getTriggerMode = (text: string, agentEnabled: boolean): 'always' | 'never' =>
  agentEnabled && mentionsAgent(text) ? 'always' : 'never';

const safeStorage = {
  get: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable (private mode); the room still works, it just won't remember.
    }
  },
};

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Whether the room panel is open, remembered per browser and shared by the button and the panel. */
export const useRoomOpenState = (): [boolean, (open: boolean) => void] => {
  const isOpen = useSyncExternalStore(subscribe, () => safeStorage.get(OPEN_KEY) === 'true');
  const setOpen = useCallback((open: boolean) => {
    safeStorage.set(OPEN_KEY, String(open));
    listeners.forEach((listener) => listener());
  }, []);
  return [isOpen, setOpen];
};

/** Messages already posted to the case from this browser. */
export const usePostedMessages = (caseId: string) => {
  const read = useCallback(() => safeStorage.get(POSTED_KEY(caseId)) ?? '[]', [caseId]);
  const raw = useSyncExternalStore(subscribe, read);
  const posted = new Set<string>(JSON.parse(raw) as string[]);
  const markPosted = useCallback(
    (key: string) => {
      const next = new Set<string>(JSON.parse(read()) as string[]);
      next.add(key);
      safeStorage.set(POSTED_KEY(caseId), JSON.stringify([...next]));
      listeners.forEach((listener) => listener());
    },
    [caseId, read]
  );
  return { posted, markPosted };
};

export interface RoomEvent {
  id: string;
  type: string;
  created_at: string;
  actor?: { type?: string; username?: string; full_name?: string };
  data?: {
    message?: string;
    outcome?: { type?: string; response?: { message?: string } };
  };
}

interface RoomConversation {
  id: string;
  agent_id: string;
  events?: RoomEvent[];
}

export type RoomMessage =
  | { kind: 'person'; id: string; text: string; author: string; createdAt: string }
  | { kind: 'agent'; id: string; text: string; createdAt: string }
  | { kind: 'agentWaiting'; id: string; createdAt: string };

/**
 * The room's messages, from the conversation timeline: people's messages (posted with or without
 * the agent), the agent's finished replies, and the agent pausing to ask for a confirmation.
 */
export const toRoomMessages = (events: RoomEvent[], unknownAuthor: string): RoomMessage[] =>
  events.flatMap((event): RoomMessage[] => {
    if (event.type === 'user_message' && event.data?.message) {
      return [
        {
          kind: 'person',
          id: event.id,
          text: event.data.message,
          author: event.actor?.full_name || event.actor?.username || unknownAuthor,
          createdAt: event.created_at,
        },
      ];
    }
    if (event.type === 'execution_terminated') {
      const outcome = event.data?.outcome;
      if (outcome?.type === 'responded' && outcome.response?.message) {
        return [
          {
            kind: 'agent',
            id: event.id,
            text: outcome.response.message,
            createdAt: event.created_at,
          },
        ];
      }
      if (outcome?.type === 'prompt_requested') {
        return [{ kind: 'agentWaiting', id: event.id, createdAt: event.created_at }];
      }
    }
    return [];
  });

export const roomQueryKey = (caseId: string) => [...casesQueriesKeys.case(caseId), 'room'] as const;

export const useCaseRoom = (caseId: string, enabled: boolean) => {
  const { http } = useKibana().services;
  const room = useQuery({
    queryKey: [...roomQueryKey(caseId), 'ensure'],
    queryFn: () => ensureCaseRoom(caseId),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
  const conversationId = room.data?.conversation_id;
  const conversation = useQuery({
    queryKey: [...roomQueryKey(caseId), 'conversation', conversationId],
    queryFn: ({ signal }) =>
      http.get<RoomConversation>(
        `/api/agent_builder/conversations/${encodeURIComponent(conversationId ?? '')}`,
        { version: AGENT_BUILDER_API_VERSION, signal }
      ),
    enabled: enabled && conversationId != null,
    refetchInterval: enabled ? REFRESH_MS : false,
  });
  return { room, conversation, conversationId };
};

export const useSendRoomMessage = (caseData: CaseUI, conversationId?: string) => {
  const { http, application } = useKibana().services;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ text, triggerMode }: { text: string; triggerMode: 'always' | 'never' }) =>
      http.post('/api/chat/converse', {
        version: AGENT_BUILDER_API_VERSION,
        body: JSON.stringify({
          conversation_id: conversationId,
          input: text,
          trigger_mode: triggerMode,
          // The agent reads the case it is in from this attachment.
          ...(triggerMode === 'always'
            ? { attachments: [getCaseAttachment(caseData, application)] }
            : {}),
        }),
      }),
    onSettled: () => queryClient.invalidateQueries(roomQueryKey(caseData.id)),
  });
};

export const usePostFromRoom = (caseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId }: { eventId: string }) => postFromRoom(caseId, eventId),
    onSuccess: () => queryClient.invalidateQueries(casesQueriesKeys.caseView()),
  });
};
