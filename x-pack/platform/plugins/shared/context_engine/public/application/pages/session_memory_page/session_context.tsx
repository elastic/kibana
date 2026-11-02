/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCurrentUserId } from '../../hooks/use_current_user_id';
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceId } from '../../hooks/use_space_id';

/**
 * The identity and scope every session memory call shares. User and space come from the Kibana
 * session; the session id is generated per page visit and the agent and AI index are picked once.
 */
export interface SessionContextValue {
  userId: string | undefined;
  spaceId: string | undefined;
  sessionId: string;
  setSessionId: (sessionId: string) => void;
  newSession: () => void;
  agentId: string;
  setAgentId: (agentId: string) => void;
  aiIndexIds: string[];
  setAiIndexIds: (aiIndexIds: string[]) => void;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const generateSessionId = (): string =>
  `session-${uuidv4().replaceAll('-', '').slice(0, 8)}`;

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    services: { spaces },
  } = useKibana();
  const userId = useCurrentUserId();
  const { spaceId } = useSpaceId(spaces);
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [agentId, setAgentId] = useState('');
  const [aiIndexIds, setAiIndexIds] = useState<string[]>([]);
  const newSession = useCallback(() => setSessionId(generateSessionId()), []);

  const value = useMemo<SessionContextValue>(
    () => ({
      userId,
      spaceId,
      sessionId,
      setSessionId,
      newSession,
      agentId,
      setAgentId,
      aiIndexIds,
      setAiIndexIds,
    }),
    [userId, spaceId, sessionId, newSession, agentId, aiIndexIds]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSessionContext = (): SessionContextValue => {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSessionContext must be used within a SessionContextProvider');
  }
  return value;
};

/** Whether the required write identity (session, user, agent) is known. */
export const hasWriteIdentity = ({ sessionId, userId, agentId }: SessionContextValue): boolean =>
  sessionId.trim().length > 0 && Boolean(userId) && agentId.trim().length > 0;
