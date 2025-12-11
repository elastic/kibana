/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Represents the current state of an @mention in the editor
 */
export interface MentionContext {
  /** Whether an @ mention is currently being typed */
  isActive: boolean;
  /** The text after @ (e.g., "sal" from "@sal") */
  searchTerm: string;
  /** Position of @ in text (character index) */
  startPosition: number;
  /** Position for anchoring the popover (relative to viewport) */
  anchorPosition: { top: number; left: number } | null;
}

/**
 * Initial empty mention context
 */
const INITIAL_CONTEXT: MentionContext = {
  isActive: false,
  searchTerm: '',
  startPosition: -1,
  anchorPosition: null,
};

/**
 * Regex to find @ mentions - matches @ followed by non-whitespace characters
 */
const AT_MENTION_PATTERN = /@([^\s@]*)/;

/**
 * Hook to detect @mention patterns in the message editor content.
 * Monitors cursor position and text content to identify when the user
 * is typing an @mention.
 *
 * @param editorRef - Reference to the contenteditable editor element
 * @returns {MentionContext} Current mention detection context
 *
 * @example
 * ```tsx
 * const mentionContext = useMentionDetection(editorRef);
 *
 * useEffect(() => {
 *   if (mentionContext.isActive) {
 *     search(mentionContext.searchTerm);
 *   }
 * }, [mentionContext.isActive, mentionContext.searchTerm]);
 * ```
 */
export function useMentionDetection(
  editorRef: React.RefObject<HTMLDivElement>
): MentionContext {
  // eslint-disable-next-line no-console
  console.debug('[useMentionDetection] Hook called, editorRef:', editorRef);

  const [mentionContext, setMentionContext] = useState<MentionContext>(INITIAL_CONTEXT);
  const isCheckingRef = useRef(false);
  // Track when editor becomes available to trigger re-render and setup listeners
  const [editorMounted, setEditorMounted] = useState(false);

  const checkForMention = useCallback(() => {
    // Prevent re-entrant calls
    if (isCheckingRef.current) {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      setMentionContext(INITIAL_CONTEXT);
      return;
    }

    // Debug: log when checking for mentions
    // eslint-disable-next-line no-console
    console.debug('[useMentionDetection] Checking for mention, text:', editor.textContent?.substring(0, 50));

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setMentionContext(INITIAL_CONTEXT);
      return;
    }

    const range = selection.getRangeAt(0);

    // Only proceed if cursor is within the editor
    if (!editor.contains(range.startContainer)) {
      setMentionContext(INITIAL_CONTEXT);
      return;
    }

    isCheckingRef.current = true;

    try {
      const text = editor.textContent || '';
      const cursorPosition = getCursorPosition(editor, selection);

      // Find the word being typed at cursor position
      const textBeforeCursor = text.substring(0, cursorPosition);

      // Look for @ in the current word (text since last whitespace or start)
      const lastWhitespace = Math.max(
        textBeforeCursor.lastIndexOf(' '),
        textBeforeCursor.lastIndexOf('\n'),
        textBeforeCursor.lastIndexOf('\t')
      );

      const currentWord = textBeforeCursor.substring(lastWhitespace + 1);
      const match = currentWord.match(AT_MENTION_PATTERN);

      if (match) {
        const searchTerm = match[1]; // Text after @
        const atPositionInWord = match.index!;
        const atPositionInText = (lastWhitespace + 1) + atPositionInWord;

        // Get position for popover anchoring
        let anchorPosition = getCaretPosition();

        // Fallback: use editor's bounding rect if caret position unavailable
        if (!anchorPosition && editor) {
          const editorRect = editor.getBoundingClientRect();
          anchorPosition = {
            top: editorRect.top + 20, // Offset from top of editor
            left: editorRect.left,
          };
        }

        // Debug: log when mention is detected
        // eslint-disable-next-line no-console
        console.debug('[useMentionDetection] Mention detected:', { searchTerm, anchorPosition });

        setMentionContext({
          isActive: true,
          searchTerm,
          startPosition: atPositionInText,
          anchorPosition,
        });
      } else {
        setMentionContext(INITIAL_CONTEXT);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [editorRef]);

  // Use a polling mechanism to detect when the editor ref becomes available
  // This is needed because the ref.current is assigned after the component mounts
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[useMentionDetection] Polling effect starting, ref.current:', !!editorRef.current);

    // Check immediately
    if (editorRef.current) {
      // eslint-disable-next-line no-console
      console.debug('[useMentionDetection] Editor already available, setting mounted');
      setEditorMounted(true);
      return;
    }

    // Poll for the editor to become available
    const checkInterval = setInterval(() => {
      if (editorRef.current) {
        // eslint-disable-next-line no-console
        console.debug('[useMentionDetection] Editor became available via polling');
        setEditorMounted(true);
        clearInterval(checkInterval);
      }
    }, 50);

    // Clean up after 2 seconds (should be mounted by then)
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 2000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [editorRef]);

  // Listen for input and selection changes
  // Note: editorMounted is a dependency to re-run this effect when the editor becomes available
  useEffect(() => {
    const editor = editorRef.current;

    // Debug: log effect state
    // eslint-disable-next-line no-console
    console.debug('[useMentionDetection] Setup effect running, editorMounted:', editorMounted, 'editor:', !!editor);

    if (!editor) {
      return;
    }

    // eslint-disable-next-line no-console
    console.debug('[useMentionDetection] Attaching event listeners to editor');

    const handleInput = () => {
      checkForMention();
    };

    const handleSelectionChange = () => {
      // Only check if the selection is within our editor
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editor.contains(range.startContainer)) {
          checkForMention();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Cancel mention on Escape
      if (event.key === 'Escape' && mentionContext.isActive) {
        setMentionContext(INITIAL_CONTEXT);
        return;
      }

      // Also check on key up for cursor movement
      checkForMention();
    };

    editor.addEventListener('input', handleInput);
    editor.addEventListener('keyup', handleKeyUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      editor.removeEventListener('input', handleInput);
      editor.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
    // editorMounted is needed to re-run when the ref becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMounted, checkForMention, mentionContext.isActive]);

  return mentionContext;
}

/**
 * Gets the cursor position (character index) within the editor
 */
function getCursorPosition(editor: HTMLElement, selection: Selection): number {
  const range = selection.getRangeAt(0);

  // Create a range from start of editor to cursor
  const preCaretRange = document.createRange();
  preCaretRange.selectNodeContents(editor);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  return preCaretRange.toString().length;
}

/**
 * Gets the pixel position of the caret for popover positioning
 */
function getCaretPosition(): { top: number; left: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);

  const rect = range.getBoundingClientRect();

  // If no rect (empty range), try to get from caret rect
  if (rect.width === 0 && rect.height === 0) {
    // Fallback: insert a temporary span to get position
    const span = document.createElement('span');
    span.textContent = '\u200b'; // Zero-width space
    range.insertNode(span);
    const spanRect = span.getBoundingClientRect();
    span.parentNode?.removeChild(span);

    // Normalize the DOM after temporary insertion
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.setStart(range.startContainer, range.startOffset);
    newRange.collapse(true);
    selection.addRange(newRange);

    return {
      top: spanRect.bottom,
      left: spanRect.left,
    };
  }

  return {
    top: rect.bottom,
    left: rect.left,
  };
}

/**
 * Reset the mention context to initial state
 */
export function createResetMentionContext(): MentionContext {
  return { ...INITIAL_CONTEXT };
}
