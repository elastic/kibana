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
// WorkflowAutocompleteDropdown removed - using shortcut menu instead

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
  
  // Debug workflow suggestions
  console.log('Workflow suggestions for shortcut menu:', {
    suggestions: autocomplete.suggestions,
    count: autocomplete.suggestions?.length,
    shortcutMenuLevel: shortcutMenu.level,
    shortcutMenuVisible: shortcutMenu.isVisible
  });
  
  // Disable old workflow autocomplete when shortcut menu is active
  const shouldShowOldAutocomplete = autocomplete.isVisible && !shortcutMenu.isVisible && !input.includes('/');
  
  // Debug autocomplete state
  console.log('Autocomplete state:', {
    isVisible: autocomplete.isVisible,
    triggerType: autocomplete.triggerType,
    suggestions: autocomplete.suggestions,
    query: autocomplete.query,
  });
  
  // Check for workflow commands in the input
  const workflowCommands = parseWorkflowCommands(input);
  
  // Debug: Log workflow commands
  if (workflowCommands.length > 0) {
    console.log('Workflow commands found:', workflowCommands);
    console.log('Input:', input);
  }
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
  
  // Update dropdown position when menus become visible
  useEffect(() => {
    if ((autocomplete.isVisible || shortcutMenu.isVisible) && textAreaRef.current) {
      const rect = textAreaRef.current.getBoundingClientRect();
      const newPosition = {
        top: rect.bottom + 5,
        left: rect.left,
      };
      console.log('Updating dropdown position:', {
        newPosition,
        rect,
        shortcutMenuVisible: shortcutMenu.isVisible,
        autocompleteVisible: autocomplete.isVisible,
        textAreaExists: !!textAreaRef.current
      });
      setDropdownPosition(newPosition);
    }
  }, [autocomplete.isVisible, shortcutMenu.isVisible]);
  
  // Force position update when shortcut menu visibility changes
  useEffect(() => {
    if (shortcutMenu.isVisible && textAreaRef.current) {
      const rect = textAreaRef.current.getBoundingClientRect();
      const newPosition = {
        top: rect.bottom + 5,
        left: rect.left,
      };
      console.log('Force updating position for shortcut menu:', newPosition);
      setDropdownPosition(newPosition);
    }
  }, [shortcutMenu.isVisible]);

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
    
    // Sort commands by position (reverse order to maintain indices)
    const sortedCommands = [...workflowCommands].sort((a, b) => b.startIndex - a.startIndex);
    
    // Replace workflow commands with highlighted versions
    sortedCommands.forEach((cmd) => {
      const beforeText = highlightedText.slice(0, cmd.startIndex);
      const afterText = highlightedText.slice(cmd.endIndex);
      const highlightedCmd = `<span style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); color: #1565c0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #90caf9; position: relative; z-index: 3;">${cmd.originalText}</span>`;
      highlightedText = beforeText + highlightedCmd + afterText;
    });
    
    // Hide non-workflow text
    let maskedHighlightedText = highlightedText;
    sortedCommands.forEach((cmd) => {
      // Replace everything except the highlighted spans with transparent text
      maskedHighlightedText = maskedHighlightedText.replace(
        /(?!<span[^>]*style="[^"]*background[^"]*")[^<]+(?!<\/span>)/g, 
        (match) => `<span style="color: transparent;">${match}</span>`
      );
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
    
    // Sort commands by position (reverse order to maintain indices)
    const sortedCommands = [...workflowCommands].sort((a, b) => b.startIndex - a.startIndex);
    
    // Replace workflow commands with invisible placeholders
    sortedCommands.forEach((cmd) => {
      const beforeText = maskedText.slice(0, cmd.startIndex);
      const afterText = maskedText.slice(cmd.endIndex);
      const invisibleText = '\u00A0'.repeat(cmd.originalText.length); // Non-breaking spaces same length
      maskedText = beforeText + `<span style="color: transparent;">${invisibleText}</span>` + afterText;
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
          color: '#333', // Show non-workflow text normally
          zIndex: 2,
        }}
        dangerouslySetInnerHTML={{ __html: maskedText }}
      />
    );
  };
  
  // Create a visual cursor indicator when cursor is within workflow commands
  const cursorInWorkflow = workflowCommands.some(cmd => 
    cursorPosition >= cmd.startIndex && cursorPosition <= cmd.endIndex
  );
  
  // Calculate more accurate cursor position
  const calculateCursorPosition = () => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    const lineNumber = lines.length - 1;
    const charInLine = lines[lines.length - 1].length;
    
    return {
      top: 8 + (lineNumber * 21),
      left: 12 + (charInLine * 8.4),
    };
  };
  
  const cursorPos = calculateCursorPosition();

  return (
    <EuiFlexItem css={inputContainerStyles} style={{ position: 'relative' }}>
      {/* Visual cursor indicator when cursor is within workflow commands */}
      {cursorInWorkflow && (
        <div
          style={{
            position: 'absolute',
            top: `${cursorPos.top}px`,
            left: `${cursorPos.left}px`,
            width: '2px',
            height: '21px',
            backgroundColor: '#ff0000', // Bright red for visibility
            zIndex: 4,
            opacity: 0.8,
            pointerEvents: 'none',
          }}
        />
      )}
      
      {/* Display layer - shows formatted text with workflow tokens */}
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
          fontFamily: 'inherit',
          zIndex: hasWorkflowCommands ? 2 : -1,
          color: '#333',
          // Only show when we have workflow commands
          display: hasWorkflowCommands ? 'block' : 'none',
          // Create a small gap for cursor visibility
          background: 'rgba(255, 255, 255, 0.01)', // Almost transparent background
        }}
      >
        {(() => {
          if (!hasWorkflowCommands) return null;
          
          const parts = [];
          let lastIndex = 0;
          
          // Sort commands by position
          const sortedCommands = [...workflowCommands].sort((a, b) => a.startIndex - b.startIndex);
          
          sortedCommands.forEach((cmd) => {
            // Add text before this command
            if (cmd.startIndex > lastIndex) {
              parts.push(input.slice(lastIndex, cmd.startIndex));
            }
            
            // Add the styled workflow command
            parts.push(
              <span
                key={cmd.startIndex}
                style={{
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  color: '#1565c0',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: '500',
                  border: '1px solid #90caf9',
                  marginRight: '2px',
                }}
              >
                {cmd.originalText}
              </span>
            );
            
            lastIndex = cmd.endIndex;
          });
          
          // Add any remaining text after the last command
          if (lastIndex < input.length) {
            parts.push(input.slice(lastIndex));
          }
          
          return parts;
        })()} 
      </div>
      
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
          caretColor: '#333 !important', // Force cursor visibility
          // Make text completely transparent when we have workflow commands
          color: hasWorkflowCommands ? 'transparent' : undefined,
          background: hasWorkflowCommands ? 'transparent' : undefined,
          // Ensure cursor is always on top
          caretWidth: '2px',
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
              console.log('Tab key pressed in shortcut menu');
              const result = shortcutMenu.selectItem();
              console.log('selectItem result:', result);
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
          
          // Old autocomplete navigation removed - using shortcut menu only
          
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
      {shortcutMenu.isVisible && (() => {
        // Calculate position relative to viewport, not absolute
        let currentPosition = { top: 100, left: 100 }; // Safe fallback
        
        if (textAreaRef.current) {
          const rect = textAreaRef.current.getBoundingClientRect();
          console.log('TextArea rect:', rect);
          console.log('Window dimensions:', { width: window.innerWidth, height: window.innerHeight });
          console.log('Scroll position:', { scrollX: window.scrollX, scrollY: window.scrollY });
          
          // Use a safer position calculation
          currentPosition = {
            top: Math.min(rect.bottom + 5, window.innerHeight - 400), // Keep within viewport
            left: Math.max(20, Math.min(rect.left, window.innerWidth - 400)), // Keep within viewport
          };
          console.log('Calculated position:', currentPosition);
        }
        
        return (
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
            position={currentPosition}
          />
        );
      })()}
      
      {/* Old workflow autocomplete is now disabled - using shortcut menu instead */}
    </EuiFlexItem>
  );
};
