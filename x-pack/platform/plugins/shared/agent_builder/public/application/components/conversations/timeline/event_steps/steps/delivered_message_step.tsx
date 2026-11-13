/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DeliveredMessageStep as DeliveredMessageStepData } from '@kbn/agent-builder-common';
import { UserMessage } from '../../user_message/user_message';
import { eventActorToRoundAuthor } from '../../round_author';

interface DeliveredMessageStepProps {
  step: DeliveredMessageStepData;
}

export const DeliveredMessageStep: React.FC<DeliveredMessageStepProps> = ({ step }) => (
  <div data-test-subj="agentBuilderDeliveredMessageStep">
    <UserMessage
      input={step.message}
      startedAt={step.delivered_at}
      author={eventActorToRoundAuthor(step.author)}
      origin={step.author.origin}
      isPendingCurrentRound={false}
    />
  </div>
);
