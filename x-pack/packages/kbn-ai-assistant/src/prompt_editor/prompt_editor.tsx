/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, keys } from '@elastic/eui';
import {
  type Message,
  MessageRole,
  type TelemetryEventTypeWithPayload,
  ObservabilityAIAssistantTelemetryEventType,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useLastUsedPrompts } from '../hooks/use_last_used_prompts';
import { FunctionListPopover } from '../chat/function_list_popover';
import { PromptEditorFunction } from './prompt_editor_function';
import { PromptEditorNaturalLanguage } from './prompt_editor_natural_language';
import { useScopes } from '../hooks/use_scopes';

export interface PromptEditorProps {
  disabled: boolean;
  hidden: boolean;
  loading: boolean;
  initialRole?: Message['message']['role'];
  initialFunctionCall?: Message['message']['function_call'];
  initialContent?: Message['message']['content'];
  onChangeHeight: (height: number) => void;
  onSendTelemetry: (eventWithPayload: TelemetryEventTypeWithPayload) => void;
  onSubmit: (message: Message) => void;
}

export function PromptEditor({
  disabled,
  hidden,
  loading,
  initialRole,
  initialFunctionCall,
  initialContent,
  onChangeHeight,
  onSendTelemetry,
  onSubmit,
}: PromptEditorProps) {
  const scopes = useScopes();
  const containerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'prompt' | 'function'>(
    initialFunctionCall?.name ? 'function' : 'prompt'
  );

  const [hasFocus, setHasFocus] = useState(false);

  const { lastUsedPrompts, addLastUsedPrompt } = useLastUsedPrompts();

  const initialInnerMessage = initialRole
    ? {
        role: initialRole,
        content: initialContent ?? '',
        ...(initialFunctionCall ? { function_call: initialFunctionCall } : {}),
      }
    : undefined;

  const [innerMessage, setInnerMessage] = useState<Message['message'] | undefined>(
    initialInnerMessage
  );

  const invalid = useMemo(() => {
    let isInvalid = false;

    if (innerMessage?.function_call?.name && innerMessage?.function_call?.arguments) {
      try {
        JSON.parse(innerMessage.function_call.arguments);
      } catch (e) {
        isInvalid = true;
      }
      return isInvalid;
    }
  }, [innerMessage?.function_call?.arguments, innerMessage?.function_call?.name]);

  const handleChangeMessageInner = (newInnerMessage: Message['message']) => {
    setInnerMessage(newInnerMessage);
  };

  const handleSelectFunction = (func: string | undefined) => {
    if (func) {
      setMode('function');
      setInnerMessage({
        function_call: { name: func, trigger: MessageRole.Assistant },
        role: MessageRole.User,
      });
      onChangeHeight(200);
      return;
    }

    setMode('prompt');
    setInnerMessage(undefined);

    if (containerRef.current) {
      onChangeHeight(containerRef.current.clientHeight);
    }
  };

  const handleSubmit = useCallback(() => {
    if (loading || !innerMessage) {
      return;
    }

    if (innerMessage.content) {
      addLastUsedPrompt(innerMessage.content);
    }

    const oldMessage = innerMessage;

    try {
      const message = {
        '@timestamp': new Date().toISOString(),
        message: innerMessage,
      };

      onSubmit(message);

      setInnerMessage(undefined);
      setMode('prompt');
      onSendTelemetry({
        type: ObservabilityAIAssistantTelemetryEventType.UserSentPromptInChat,
        payload: { scopes },
      });
    } catch (_) {
      setInnerMessage(oldMessage);
      setMode(oldMessage.function_call?.name ? 'function' : 'prompt');
    }
  }, [addLastUsedPrompt, innerMessage, loading, onSendTelemetry, onSubmit, scopes]);

  // Submit on Enter
  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (innerMessage && !disabled && !invalid && hasFocus) {
        if (!event.shiftKey && event.key === keys.ENTER) {
          event.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener('keypress', keyboardListener);

    return () => {
      window.removeEventListener('keypress', keyboardListener);
    };
  }, [disabled, handleSubmit, hasFocus, innerMessage, invalid]);

  useEffect(() => {
    if (hidden) {
      onChangeHeight(0);
    } else if (containerRef.current) {
      onChangeHeight(containerRef.current.clientHeight);
    }
  }, [hidden, onChangeHeight]);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" ref={containerRef}>
      <EuiFlexItem grow={false}>
        <FunctionListPopover
          mode={mode}
          selectedFunctionName={innerMessage?.function_call?.name}
          onSelectFunction={handleSelectFunction}
          disabled={loading || disabled}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {mode === 'function' && innerMessage?.function_call?.name ? (
          <PromptEditorFunction
            functionName={innerMessage.function_call.name}
            functionPayload={innerMessage.function_call.arguments}
            onChange={handleChangeMessageInner}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
          />
        ) : (
          <PromptEditorNaturalLanguage
            disabled={disabled}
            prompt={innerMessage?.content}
            lastUsedPrompts={lastUsedPrompts}
            onChange={handleChangeMessageInner}
            onChangeHeight={onChangeHeight}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
          />
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="observabilityAiAssistantChatPromptEditorButtonIcon"
          aria-label={i18n.translate(
            'xpack.aiAssistant.chatPromptEditor.euiButtonIcon.submitLabel',
            { defaultMessage: 'Submit' }
          )}
          disabled={loading || disabled || invalid}
          display={
            mode === 'function'
              ? innerMessage?.function_call?.name
                ? 'fill'
                : 'base'
              : innerMessage?.content
              ? 'fill'
              : 'base'
          }
          iconType="kqlFunction"
          isLoading={loading}
          size="m"
          onClick={handleSubmit}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
