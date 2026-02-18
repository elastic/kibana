/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { css } from '@emotion/react';
import { useAttachmentPanel } from '../../../context/attachment_panel/attachment_panel_context';

const COLORS = {
  bg: '#1a1a1a',
  bgHover: '#2a2a2a',
  bgActive: '#333333',
  text: '#E0E0E0',
  textWhite: '#ffffff',
  iconMuted: '#A0A0A0',
  badgeBg: 'rgba(255, 255, 255, 0.2)',
  border: 'rgba(255, 255, 255, 0.08)',
  line: 'rgba(160, 160, 160, 0.45)',
};

const MenuIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke={COLORS.iconMuted}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const ChevronIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      fill={COLORS.iconMuted}
      d="M12 21a1 1 0 0 1-.707-.293l-5-5-.068-.076a1 1 0 0 1 1.406-1.406l.076.068L12 18.586l4.293-4.293a1 1 0 1 1 1.414 1.414l-5 5-.073.066A1 1 0 0 1 12 21m0-18a1 1 0 0 0-.707.293l-5 5-.068.076A1 1 0 0 0 7.63 9.775l.076-.068L12 5.414l4.293 4.293a1 1 0 1 0 1.414-1.414l-5-5-.073-.066A1 1 0 0 0 12 3"
    />
  </svg>
);

type WidgetState = 'line' | 'pill' | 'open';

/* Framer Motion variants — three states */
const shellVariants = {
  line: { width: 48, height: 5, borderRadius: 100 },
  pill: { width: 300, height: 48, borderRadius: 100 },
  open: { width: 400, height: 'auto' as const, borderRadius: 16 },
};

const labelContainerVariants = {
  pill: { width: 140 },
  open: { width: 220 },
};

const dropdownVariants = {
  open: { height: 'auto' as const, opacity: 1 },
  closed: { height: 0, opacity: 0 },
};

const shellTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

const tweenTransition = {
  type: 'tween' as const,
  duration: 0.2,
  ease: 'easeInOut' as const,
};

const dropdownTransition = {
  height: { type: 'tween' as const, ease: 'easeInOut' as const, duration: 0.3 },
  opacity: { duration: 0.2 },
};

interface AttachmentNavigatorProps {
  isPanelHovered: boolean;
}

export const AttachmentNavigator: React.FC<AttachmentNavigatorProps> = ({ isPanelHovered }) => {
  const {
    attachmentId,
    attachments,
    tempTitles,
    navigateToAttachment,
    scrollToAttachmentInChat,
  } = useAttachmentPanel();

  const [state, setState] = useState<WidgetState>('line');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = attachmentId ? attachments.findIndex((a) => a.id === attachmentId) : -1;
  const currentEntry = currentIndex >= 0 ? attachments[currentIndex] : undefined;
  const currentLabel =
    (currentEntry && (tempTitles[currentEntry.id] || currentEntry.id)) ?? 'Overview';

  const countLabel = useMemo(() => {
    if (attachments.length === 0) return '';
    return `${currentIndex + 1}/${attachments.length}`;
  }, [attachments.length, currentIndex]);

  // Collapse to line when the mouse leaves the panel entirely
  useEffect(() => {
    if (!isPanelHovered) {
      setState((prev) => (prev === 'pill' ? 'line' : prev));
    }
  }, [isPanelHovered]);

  const handleLineHover = useCallback(() => {
    setState((prev) => (prev === 'line' ? 'pill' : prev));
  }, []);

  const handleClick = useCallback(() => {
    setState((prev) => {
      if (prev === 'line') return 'pill';
      if (prev === 'pill') return 'open';
      if (prev === 'open') return 'pill';
      return prev;
    });
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      navigateToAttachment(id);
      scrollToAttachmentInChat(id);
      setState('pill');
    },
    [navigateToAttachment, scrollToAttachmentInChat]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(id);
      }
    },
    [handleSelect]
  );

  // Close on click outside
  useEffect(() => {
    if (state !== 'open') return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setState('pill');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [state]);

  if (attachments.length <= 1) {
    return null;
  }

  const isExpanded = state === 'pill' || state === 'open';

  return (
    <div
      ref={containerRef}
      css={positionerStyles}
      onMouseEnter={handleLineHover}
    >
      <motion.div
        css={[shellStyles, state === 'line' && lineShellStyles]}
        variants={shellVariants}
        initial="line"
        animate={state}
        transition={shellTransition}
        data-test-subj="attachmentNavigator"
        onClick={state === 'line' ? handleClick : undefined}
      >
        {/* Pill content — fades in/out */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="pill-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              css={pillContentWrapStyles}
            >
              {/* Header / pill row */}
              <div css={headerRowStyles} onClick={handleClick} role="button" tabIndex={0}>
                <div css={headerLeftStyles}>
                  <span css={iconWrapStyles}>
                    <MenuIcon />
                  </span>

                  {/* Animated label container with text swap */}
                  <motion.div
                    css={labelContainerStyles}
                    variants={labelContainerVariants}
                    animate={state === 'open' ? 'open' : 'pill'}
                    transition={tweenTransition}
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentEntry?.id ?? 'overview'}
                        css={labelTextStyles}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        title={currentLabel}
                      >
                        {currentLabel}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>

                  <span css={iconWrapStyles}>
                    <ChevronIcon />
                  </span>
                </div>

                {/* Count badge */}
                {countLabel && <div css={badgeStyles}>{countLabel}</div>}
              </div>

              {/* Animated dropdown list */}
              <motion.div
                css={dropdownWrapStyles}
                animate={state === 'open' ? 'open' : 'closed'}
                initial="closed"
                variants={dropdownVariants}
                transition={dropdownTransition}
              >
                <div css={listStyles}>
                  <ul css={listUlStyles} role="listbox" aria-label="Attachment list">
                    {attachments.map((entry, index) => (
                      <motion.li
                        key={entry.id}
                        role="option"
                        aria-selected={entry.id === attachmentId}
                        tabIndex={0}
                        css={itemStyles}
                        custom={index}
                        initial={{ opacity: 0, y: 10, x: -5 }}
                        animate={
                          state === 'open'
                            ? {
                                opacity: 1,
                                y: 0,
                                x: 0,
                                transition: {
                                  opacity: { duration: 0.2, delay: 0.1 + 0.05 * index },
                                  y: {
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 24,
                                    delay: 0.1 + 0.05 * index,
                                  },
                                  x: { duration: 0.2, delay: 0.1 + 0.05 * index },
                                },
                              }
                            : {
                                opacity: 0,
                                y: 10,
                                x: -5,
                                transition: { duration: 0.1 },
                              }
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(entry.id);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, entry.id)}
                      >
                        {tempTitles[entry.id] || entry.id}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

/* ——— Styles ——— */

const positionerStyles = css`
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
`;

const shellStyles = css`
  overflow: hidden;
  backdrop-filter: blur(10px);
  background: ${COLORS.bg};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  color: ${COLORS.text};
  cursor: default;
`;

const lineShellStyles = css`
  background: ${COLORS.line};
  box-shadow: none;
  cursor: pointer;
`;

const pillContentWrapStyles = css`
  width: 100%;
  height: 100%;
`;

const headerRowStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 20px;
  cursor: pointer;
  user-select: none;

  &:focus-visible {
    outline: 2px solid #4dacff;
    outline-offset: -2px;
  }
`;

const headerLeftStyles = css`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const iconWrapStyles = css`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const labelContainerStyles = css`
  position: relative;
  height: 20px;
  overflow: hidden;
`;

const labelTextStyles = css`
  display: block;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const badgeStyles = css`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${COLORS.badgeBg};
  border-radius: 100px;
  height: 24px;
  min-width: 54px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: ${COLORS.textWhite};
  flex-shrink: 0;
`;

const dropdownWrapStyles = css`
  overflow: hidden;
`;

const listStyles = css`
  padding: 0 20px 16px;
  max-height: 220px;
  overflow-y: auto;
`;

const listUlStyles = css`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const itemStyles = css`
  padding: 10px 0;
  font-size: 14px;
  font-weight: 400;
  color: ${COLORS.text};
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s ease;
  list-style: none;

  &:hover {
    color: ${COLORS.textWhite};
  }

  &:focus-visible {
    outline: 2px solid #4dacff;
    outline-offset: 2px;
    color: ${COLORS.textWhite};
  }
`;
