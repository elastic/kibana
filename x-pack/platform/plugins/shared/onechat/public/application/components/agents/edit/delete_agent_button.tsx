/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useDeleteAgent } from '../../../context/delete_agent_context';
import { useOnechatAgentById } from '../../../hooks/agents/use_agent_by_id';

interface DeleteAgentButtonProps {
  agentId: string;
  isDisabled: boolean;
}

export const DeleteAgentButton: React.FC<DeleteAgentButtonProps> = ({ agentId, isDisabled }) => {
  const { deleteAgent } = useDeleteAgent();
  const { agent } = useOnechatAgentById(agentId);
  return (
    <EuiButton
      color="danger"
      iconType="trash"
      onClick={() => {
        if (agent) {
          deleteAgent({ agent });
        }
      }}
      disabled={isDisabled || !agent}
    >
      {i18n.translate('xpack.onechat.agents.form.deleteButton', {
        defaultMessage: 'Delete',
      })}
    </EuiButton>
  );
};
