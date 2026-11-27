/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { UserProfile } from '@kbn/security-plugin/common';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { toMentionToken } from '../../../../common/utils/mentions';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../../cases_context/use_cases_context';
import type { CaretPosition } from './get_caret_position';
import { getCaretPosition } from './get_caret_position';
import * as i18n from './translations';

const MAX_SUGGESTIONS = 5;
const MENTION_QUERY = /(^|\s)@([^\s@[\]()]{0,50})$/;

interface MentionQuery {
  text: string;
  /** Index of the `@` in the editor value. */
  start: number;
}

const getMentionQuery = (textarea: HTMLTextAreaElement): MentionQuery | null => {
  const { selectionStart, selectionEnd, value } = textarea;

  if (selectionStart !== selectionEnd) {
    return null;
  }

  const match = MENTION_QUERY.exec(value.slice(0, selectionStart));

  if (match == null) {
    return null;
  }

  const [, , text] = match;
  return { text, start: selectionStart - text.length - 1 };
};

interface SuggestionsProps {
  query: string;
  getTextarea: () => HTMLTextAreaElement | null | undefined;
  onSelect: (profile: UserProfile) => void;
  onClose: () => void;
}

/** Mounted only while a mention is typed, so no profile search runs otherwise. */
const MentionSuggestions: React.FC<SuggestionsProps> = ({
  query,
  getTextarea,
  onSelect,
  onClose,
}) => {
  const { owner } = useCasesContext();
  const { euiTheme } = useEuiTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: profiles = [], isFetching } = useSuggestUserProfiles({
    name: query,
    owners: owner,
    size: MAX_SUGGESTIONS,
  });

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    const textarea = getTextarea();
    if (textarea == null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (profiles.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((index) => (index + step + profiles.length) % profiles.length);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        onSelect(profiles[Math.min(activeIndex, profiles.length - 1)]);
      }
    };

    textarea.addEventListener('keydown', onKeyDown);
    return () => textarea.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, getTextarea, onClose, onSelect, profiles]);

  if (profiles.length === 0) {
    return (
      <EuiText size="s" color="subdued" css={css({ padding: euiTheme.size.s })}>
        {isFetching ? <EuiLoadingSpinner size="s" /> : i18n.NO_USERS_FOUND}
      </EuiText>
    );
  }

  return (
    <EuiListGroup
      maxWidth={false}
      aria-label={i18n.MENTION_SUGGESTIONS}
      data-test-subj="comment-mention-suggestions"
    >
      {profiles.map((profile, index) => (
        <EuiListGroupItem
          key={profile.uid}
          isActive={index === activeIndex}
          label={getUserDisplayName(profile.user)}
          icon={<UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />}
          onClick={() => onSelect(profile)}
          data-test-subj={`comment-mention-suggestion-${profile.uid}`}
        />
      ))}
    </EuiListGroup>
  );
};

MentionSuggestions.displayName = 'MentionSuggestions';

export interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  getTextarea: () => HTMLTextAreaElement | null | undefined;
  children: React.ReactElement;
}

/** Suggests users while `@name` is typed and inserts the mention token. */
export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  value,
  onChange,
  getTextarea,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<MentionQuery | null>(null);
  const [anchor, setAnchor] = useState<CaretPosition | null>(null);
  const close = useCallback(() => setQuery(null), []);

  useEffect(() => {
    const textarea = getTextarea();
    if (textarea == null) {
      return;
    }

    const updateQuery = () => {
      const nextQuery = getMentionQuery(textarea);
      const container = containerRef.current;
      setQuery(nextQuery);
      if (nextQuery != null && container != null) {
        setAnchor(getCaretPosition(textarea, nextQuery.start, container));
      }
    };
    const updateOnCaretMove = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        updateQuery();
      }
    };

    textarea.addEventListener('input', updateQuery);
    textarea.addEventListener('click', updateQuery);
    textarea.addEventListener('keyup', updateOnCaretMove);

    return () => {
      textarea.removeEventListener('input', updateQuery);
      textarea.removeEventListener('click', updateQuery);
      textarea.removeEventListener('keyup', updateOnCaretMove);
    };
  }, [getTextarea]);

  const onSelect = useCallback(
    (profile: UserProfile) => {
      const textarea = getTextarea();
      if (query == null || textarea == null) {
        return;
      }

      const token = `${toMentionToken({
        name: getUserDisplayName(profile.user),
        uid: profile.uid,
      })} `;
      const caret = textarea.selectionStart;
      const caretAfterToken = query.start + token.length;

      onChange(`${value.slice(0, query.start)}${token}${value.slice(caret)}`);
      setQuery(null);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(caretAfterToken, caretAfterToken);
      });
    },
    [getTextarea, onChange, query, value]
  );

  return (
    <div ref={containerRef} css={css({ position: 'relative' })}>
      {children}
      {query != null && anchor != null ? (
        <EuiPopover
          button={<span />}
          isOpen
          closePopover={close}
          ownFocus={false}
          anchorPosition="downLeft"
          panelPaddingSize="none"
          panelProps={{ css: css({ minWidth: 240 }) }}
          aria-label={i18n.MENTION_SUGGESTIONS}
          css={css({
            position: 'absolute',
            top: anchor.top,
            left: anchor.left,
            height: anchor.height,
            pointerEvents: 'none',
          })}
        >
          <MentionSuggestions
            query={query.text}
            getTextarea={getTextarea}
            onSelect={onSelect}
            onClose={close}
          />
        </EuiPopover>
      ) : null}
    </div>
  );
};

MentionAutocomplete.displayName = 'MentionAutocomplete';
