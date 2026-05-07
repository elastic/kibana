/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSendMessageContext } from '../context/send_message/send_message_context';

/**
 * Returns true while ANY conversation is streaming. Derived from the lifted
 * `activeStreams` map — `size > 0` means at least one stream is in flight.
 */
export const useIsAnyConversationStreaming = () => {
  const { activeStreams } = useSendMessageContext();
  return activeStreams.size > 0;
};
