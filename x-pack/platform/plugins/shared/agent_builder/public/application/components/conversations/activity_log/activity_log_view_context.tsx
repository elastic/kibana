/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useConversationId } from '../../../context/conversation/use_conversation_id';

interface ActivityLogView {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const ActivityLogViewContext = createContext<ActivityLogView | undefined>(undefined);

export const ActivityLogViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const conversationId = useConversationId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [conversationId]);

  const value = useMemo<ActivityLogView>(
    () => ({ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }),
    [isOpen]
  );

  return (
    <ActivityLogViewContext.Provider value={value}>{children}</ActivityLogViewContext.Provider>
  );
};

export const useActivityLogView = (): ActivityLogView | undefined =>
  useContext(ActivityLogViewContext);
