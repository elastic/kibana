/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CONVERSATION_TEMPLATES } from '../../../../../common/templates';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useApplyTemplate } from '../../../hooks/use_apply_template';
import { useConversation } from '../../../hooks/use_conversation';

const LABELS = {
  placeholder: i18n.translate('xpack.agentBuilder.templateSelector.placeholder', {
    defaultMessage: 'Apply template…',
  }),
  ariaLabel: i18n.translate('xpack.agentBuilder.templateSelector.ariaLabel', {
    defaultMessage: 'Apply a template to this conversation',
  }),
};

export const TemplateSelector: React.FC = () => {
  const { conversationId } = useConversationContext();
  const { conversation } = useConversation();
  const applyTemplate = useApplyTemplate(conversationId);
  const [isApplying, setIsApplying] = useState(false);

  if (!CONVERSATION_TEMPLATES.length || !conversationId) {
    return null;
  }

  const options = [
    { value: '', text: LABELS.placeholder },
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
      aria-label={LABELS.ariaLabel}
    />
  );
};
