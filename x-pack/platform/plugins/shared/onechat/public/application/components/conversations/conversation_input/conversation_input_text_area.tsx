/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiTextArea, keys } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { useConversationId } from '../../../hooks/use_conversation_id';
import { parseWorkflowCommands } from '../../../utils/workflow_commands';
import { useShortcutMenu } from './hooks/use_shortcut_menu';
import { useWorkflowAutocomplete } from './hooks/use_workflow_autocomplete';
import { ShortcutMenuDropdown } from './shortcut_menu_dropdown';
import { WorkflowAutocompleteDropdown } from './workflow_autocomplete_dropdown';

const inputContainerStyles = css`
  display: flex;
  flex-direction: column;
  position: relative;
  .euiFormControlLayout--euiTextArea,
  .euiFormControlLayout__childrenWrapper {
    height: 100%;
  }
  /* Using ID for high specificity selector */
  #conversationInput {
    border: none;
    box-shadow: none;
    outline: none;
    background-image: none;
  }
`;
const textareaStyles = css`
  height: 100%;
  padding: 0;
`;

interface ConversationInputTextAreaProps {
  input: string;
  setInput: (input: string) => void;
  onSubmit: () => void;
}

export const ConversationInputTextArea: React.FC<ConversationInputTextAreaProps> = ({
  input,
  setInput,
  onSubmit,
}) => {
  const conversationId = useConversationId();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  const autocomplete = useWorkflowAutocomplete({ input, cursorPosition });
  const shortcutMenu = useShortcutMenu({ 
    input, 
    cursorPosition, 
    workflowSuggestions: autocomplete.suggestions 
  });
  
  // Debug autocomplete state
  console.log('Autocomplete state:', {
    isVisible: autocomplete.isVisible,
    triggerType: autocomplete.triggerType,
    suggestions: autocomplete.suggestions,
    query: autocomplete.query,
  });
  
  // Check for workflow commands in the input
  const workflowCommands = parseWorkflowCommands(input);
  const hasWorkflowCommands = workflowCommands.length > 0;
  
  // Helper function to find workflow command at cursor position
  const findWorkflowCommandAtCursor = (position: number) => {
    return workflowCommands.find(cmd => 
      position >= cmd.startIndex && position <= cmd.endIndex
    );
  };
  
  // Helper function to select entire workflow command
  const selectWorkflowCommand = (command: any) => {
    if (textAreaRef.current) {
      textAreaRef.current.setSelectionRange(command.startIndex, command.endIndex);
      textAreaRef.current.focus();
    }
  };
  
  // Update dropdown position when autocomplete becomes visible
  useEffect(() => {
    if (autocomplete.isVisible && textAreaRef.current) {
      const rect = textAreaRef.current.getBoundingClientRect();
      const newPosition = {
        top: rect.bottom + 5,
        left: rect.left,
      };
      console.log('Updating dropdown position:', newPosition);
      setDropdownPosition(newPosition);
    }
  }, [autocomplete.isVisible]);

  useEffect(() => {
    // Auto focus the text area when the user switches conversations
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 200);
  }, [conversationId]);
  // Create overlay for highlighting workflow commands
  const createHighlightOverlay = () => {
    if (!hasWorkflowCommands) return null;
    
    let highlightedText = input;
    
    // Replace workflow commands with highlighted versions
    workflowCommands.forEach((cmd) => {
      const highlightedCmd = `<span style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); color: #1565c0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #90caf9; position: relative; z-index: 3;">${cmd.originalText}</span>`;
      highlightedText = highlightedText.replace(cmd.originalText, highlightedCmd);
    });
    
    return (
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          right: '12px',
          bottom: '8px',
          pointerEvents: 'none',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontSize: '14px',
          lineHeight: '1.5',
          zIndex: 3,
        }}
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    );
  };
  
  // Create a mask to hide original text where workflow commands are
  const createTextMask = () => {
    if (!hasWorkflowCommands) return null;
    
    let maskedText = input;
    
    // Replace workflow commands with invisible placeholders
    workflowCommands.forEach((cmd) => {
      const invisibleText = cmd.originalText.replace(/./g, '\u00A0'); // Non-breaking spaces
      maskedText = maskedText.replace(cmd.originalText, `<span style="color: transparent;">${invisibleText}</span>`);
    });
    
    return (
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          right: '12px',
          bottom: '8px',
          pointerEvents: 'none',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontSize: '14px',
          lineHeight: '1.5',
          zIndex: 2,
        }}
        dangerouslySetInnerHTML={{ __html: maskedText }}
      />
    );
  };
  
  return (
    <EuiFlexItem css={inputContainerStyles} style={{ position: 'relative' }}>
      {createTextMask()}
      {createHighlightOverlay()}
      <EuiTextArea
        id="conversationInput"
        name={i18n.translate('xpack.onechat.conversationInputForm.textArea.name', {
          defaultMessage: 'Conversation input',
        })}
        css={textareaStyles}
        data-test-subj="onechatAppConversationInputFormTextArea"
        value={input}
        style={{
          position: 'relative',
          zIndex: 1,
        }}
        onChange={(event) => {
          setInput(event.currentTarget.value);
          // Update cursor position on change
          setCursorPosition(event.currentTarget.selectionStart || 0);
        }}
        onSelect={(event) => {
          setCursorPosition(event.currentTarget.selectionStart || 0);
          // Update dropdown position based on cursor
          if (textAreaRef.current) {
            const rect = textAreaRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: rect.bottom + 5,
              left: rect.left,
            });
          }
        }}
        onKeyUp={(event) => {
          // Update cursor position on key up to catch arrow keys, etc.
          setCursorPosition(event.currentTarget.selectionStart || 0);
        }}
        onClick={(event) => {
          const position = event.currentTarget.selectionStart || 0;
          setCursorPosition(position);
          
          // Check if click is within a workflow command
          const command = findWorkflowCommandAtCursor(position);
          if (command) {
            // Delay selection to avoid conflict with click event
            setTimeout(() => selectWorkflowCommand(command), 10);
          }
        }}
        onKeyDown={(event) => {
          // Handle shortcut menu navigation (takes priority)
          if (shortcutMenu.isVisible) {
            if (event.key === keys.ARROW_UP) {
              event.preventDefault();
              shortcutMenu.navigateSelection('up');
              return;
            }
            if (event.key === keys.ARROW_DOWN) {
              event.preventDefault();
              shortcutMenu.navigateSelection('down');
              return;
            }
            if (event.key === keys.TAB) {
              event.preventDefault();
              const result = shortcutMenu.selectItem();
              if (result) {
                setInput(result.newInput);
                setCursorPosition(result.newCursorPosition);
                shortcutMenu.hideMenu();
                // Set cursor position after state update
                setTimeout(() => {
                  if (textAreaRef.current) {
                    textAreaRef.current.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                  }
                }, 0);
              }
              return;
            }
            if (event.key === keys.ENTER) {
              event.preventDefault();
              const result = shortcutMenu.selectItem();
              if (result) {
                setInput(result.newInput);
                setCursorPosition(result.newCursorPosition);
                shortcutMenu.hideMenu();
                // Set cursor position after state update
                setTimeout(() => {
                  if (textAreaRef.current) {
                    textAreaRef.current.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                  }
                }, 0);
              }
              return;
            }
            if (event.key === keys.BACKSPACE && shortcutMenu.level === 'workflow') {
              event.preventDefault();
              shortcutMenu.goBack();
              return;
            }
            if (event.key === keys.ESCAPE) {
              event.preventDefault();
              shortcutMenu.hideMenu();
              return;
            }
          }
          
          // Handle autocomplete navigation (when shortcut menu is not visible)
          if (autocomplete.isVisible && !shortcutMenu.isVisible) {
            if (event.key === keys.ARROW_UP) {
              event.preventDefault();
              autocomplete.navigateSelection('up');
              return;
            }
            if (event.key === keys.ARROW_DOWN) {
              event.preventDefault();
              autocomplete.navigateSelection('down');
              return;
            }
            if (event.key === keys.ENTER || event.key === keys.TAB) {
              event.preventDefault();
              const selectedSuggestion = autocomplete.getSelectedSuggestion();
              if (selectedSuggestion) {
                const { newInput, newCursorPosition } = autocomplete.selectSuggestion(selectedSuggestion);
                setInput(newInput);
                setCursorPosition(newCursorPosition);
                autocomplete.hideSuggestions();
                // Set cursor position after state update
                setTimeout(() => {
                  if (textAreaRef.current) {
                    textAreaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
                  }
                }, 0);
              }
              return;
            }
            if (event.key === keys.ESCAPE) {
              event.preventDefault();
              autocomplete.hideSuggestions();
              return;
            }
          }
          
          // Handle workflow command token behavior
          if (event.key === keys.BACKSPACE || event.key === keys.DELETE) {
            const position = event.currentTarget.selectionStart || 0;
            const command = findWorkflowCommandAtCursor(position);
            
            if (command) {
              event.preventDefault();
              // Delete the entire workflow command
              const newInput = input.slice(0, command.startIndex) + input.slice(command.endIndex);
              setInput(newInput);
              setCursorPosition(command.startIndex);
              // Focus and set cursor position
              setTimeout(() => {
                if (textAreaRef.current) {
                  textAreaRef.current.focus();
                  textAreaRef.current.setSelectionRange(command.startIndex, command.startIndex);
                }
              }, 0);
              return;
            }
          }
          
          // Handle normal enter for submission
          if (!event.shiftKey && event.key === keys.ENTER) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={i18n.translate('xpack.onechat.conversationInputForm.placeholder', {
          defaultMessage: 'Ask anything',
        })}
        rows={1}
        inputRef={textAreaRef}
        fullWidth
        resize="none"
      />
      
      {/* Shortcut menu (takes priority) */}
      {shortcutMenu.isVisible && (
        <ShortcutMenuDropdown
          items={shortcutMenu.currentItems}
          selectedIndex={shortcutMenu.selectedIndex}
          level={shortcutMenu.level}
          onSelect={(item, index) => {
            const result = shortcutMenu.selectItem();
            if (result) {
              setInput(result.newInput);
              setCursorPosition(result.newCursorPosition);
              shortcutMenu.hideMenu();
              // Focus and set cursor position
              setTimeout(() => {
                if (textAreaRef.current) {
                  textAreaRef.current.focus();
                  textAreaRef.current.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
                }
              }, 0);
            }
          }}
          position={dropdownPosition}
        />
      )}
      
      {/* Workflow autocomplete (when shortcut menu is not visible) */}
      {(() => {
        const shouldRender = autocomplete.isVisible && autocomplete.triggerType && !shortcutMenu.isVisible;
        console.log('Dropdown render check:', {
          shouldRender,
          isVisible: autocomplete.isVisible,
          triggerType: autocomplete.triggerType,
          suggestionsLength: autocomplete.suggestions?.length,
          shortcutMenuVisible: shortcutMenu.isVisible,
          dropdownPosition
        });
        return shouldRender;
      })() && (
        <WorkflowAutocompleteDropdown
          suggestions={autocomplete.suggestions}
          selectedIndex={autocomplete.selectedIndex}
          query={autocomplete.query}
          triggerType={autocomplete.triggerType}
          onSelect={(suggestion) => {
            const { newInput, newCursorPosition } = autocomplete.selectSuggestion(suggestion);
            setInput(newInput);
            setCursorPosition(newCursorPosition);
            autocomplete.hideSuggestions();
            // Focus and set cursor position
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.focus();
                textAreaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
              }
            }, 0);
          }}
          position={dropdownPosition}
        />
      )}
    </EuiFlexItem>
  );
};
