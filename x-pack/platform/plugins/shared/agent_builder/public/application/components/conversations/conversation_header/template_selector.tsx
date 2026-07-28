/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSelect } from '@elastic/eui';
import { CONVERSATION_TEMPLATES } from '../../../../../common/templates';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useApplyTemplate } from '../../hooks/use_apply_template';
import { useConversation } from '../../hooks/use_conversation';

export const TemplateSelector: React.FC = () => {
  const { conversationId } = useConversationContext();
  const { conversation } = useConversation();
  const applyTemplate = useApplyTemplate(conversationId);
  const [isApplying, setIsApplying] = useState(false);

  if (!CONVERSATION_TEMPLATES.length || !conversationId) {
    return null;
  }

  const options = [
    { value: '', text: 'Apply template…' },
    ...CONVERSATION_TEMPLATES.map((t) => ({ value: t.id, text: t.name })),
  ];

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;
    setIsApplying(true);
    try {
      await applyTemplate(templateId);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <EuiSelect
      compressed
      options={options}
      value={conversation?.template_id ?? ''}
      onChange={handleChange}
      disabled={isApplying}
      aria-label="Apply a template to this conversation"
    />
  );
};
