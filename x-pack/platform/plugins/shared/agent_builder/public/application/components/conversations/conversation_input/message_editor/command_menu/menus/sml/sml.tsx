/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useCallback, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiHighlight, useEuiTheme } from '@elastic/eui';
import type { SmlAutocompleteHttpResultItem } from '@kbn/agent-builder-sml-plugin/public';
import { SML_SEARCH_DEFAULT_SIZE } from '../../../../../../../../services/sml/constants';
import { useSmlAutocomplete } from '../../../../../../../hooks/sml/use_sml_autocomplete';
import { useAgentId } from '../../../../../../../hooks/use_conversation';
import { useAgentBuilderAgentById } from '../../../../../../../hooks/agents/use_agent_by_id';
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { CommandId } from '../../types';
import { getSmlMenuHighlightSearchStrings } from '../../utils/sml_command_menu_highlight';
import { buildSmlScopingFromAgent } from '../../utils/sml_filters';
import { CommandMenuList } from '../components/command_menu_list';
import type { CommandMenuListOption } from '../components/command_menu_list';

interface ResultsPreferExactMatch {
  readonly results: readonly SmlAutocompleteHttpResultItem[];
  readonly hasExactMatch: boolean;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Orders the results as they read in the menu, `type/title`, ignoring case. */
const sortAlphabetically = (
  results: readonly SmlAutocompleteHttpResultItem[]
): readonly SmlAutocompleteHttpResultItem[] =>
  [...results].sort((a, b) => collator.compare(`${a.type}/${a.title}`, `${b.type}/${b.title}`));

/** Reorders `results` so an exact (case-insensitive) `title` match is first. */
const getResultsPreferExactMatch = (
  results: readonly SmlAutocompleteHttpResultItem[],
  title: string
): ResultsPreferExactMatch => {
  const lowerTitle = title.toLowerCase();
  const exactIndex = results.findIndex((item) => item.title.toLowerCase() === lowerTitle);
  if (exactIndex <= 0) {
    return { results, hasExactMatch: exactIndex === 0 };
  }
  return {
    results: [
      results[exactIndex],
      ...results.slice(0, exactIndex),
      ...results.slice(exactIndex + 1),
    ],
    hasExactMatch: true,
  };
};

/** The longest prefix, ignoring case, that all of the strings start with. */
const getCommonPrefix = (strings: readonly string[]): string =>
  strings.reduce((prefix, text) => {
    let length = 0;
    while (
      length < prefix.length &&
      length < text.length &&
      prefix[length].toLowerCase() === text[length].toLowerCase()
    ) {
      length++;
    }
    return prefix.slice(0, length);
  });

/**
 * What Tab completes the typed text to, like a shell completes a path: the longest prefix that the
 * `type/title` of every result starting with the text has in common. Undefined if that adds nothing.
 * A full page may hide matches, so then only the type, which every match shows, can be completed.
 */
const getCompletion = (
  query: string,
  results: readonly SmlAutocompleteHttpResultItem[]
): string | undefined => {
  const lowerQuery = query.toLowerCase();
  const candidates = results
    .map((item) => `${item.type}/${item.title}`)
    .filter((candidate) => candidate.toLowerCase().startsWith(lowerQuery));
  if (candidates.length === 0) {
    return undefined;
  }
  let completion = getCommonPrefix(candidates);
  const slashIndex = completion.indexOf('/');
  if (results.length >= SML_SEARCH_DEFAULT_SIZE && slashIndex !== -1) {
    completion = completion.slice(0, slashIndex + 1);
  }
  return completion.length > query.length ? completion : undefined;
};

export const Sml = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect, onReplaceText, onContentChange }, ref) => {
    const agentId = useAgentId();
    const { agent } = useAgentBuilderAgentById(agentId);
    const constraints = useMemo(() => buildSmlScopingFromAgent(agent), [agent]);
    const { euiTheme } = useEuiTheme();
    const { results: matches, isLoading } = useSmlAutocomplete(query, { constraints });
    const results = useMemo(() => sortAlphabetically(matches), [matches]);
    const { type, title } = useMemo(() => getSmlMenuHighlightSearchStrings(query), [query]);
    const canSelectOnSpace = query.includes('/') && title.length > 0;
    // Highlight a space typed, or completed, after the title, which `title` leaves out.
    const titleHighlight = query.includes('/')
      ? query.slice(query.indexOf('/') + 1).trimStart()
      : title;

    // Only commit on Space once there's a confirmed exact name match
    const { results: orderedResults, hasExactMatch } = useMemo(
      () =>
        canSelectOnSpace
          ? getResultsPreferExactMatch(results, title)
          : { results, hasExactMatch: false },
      [results, title, canSelectOnSpace]
    );
    const spaceSelection = hasExactMatch;

    const hasVisibleContent = isLoading || orderedResults.length > 0;
    useEffect(() => {
      onContentChange?.(hasVisibleContent, query);
    }, [hasVisibleContent, query, onContentChange]);

    const smlMenuLabelStyles = useMemo(
      () => ({
        root: css`
          word-break: break-word;
        `,
        typeSegment: css`
          font-weight: ${euiTheme.font.weight.medium};
        `,
      }),
      [euiTheme.font.weight.medium]
    );

    const options: CommandMenuListOption[] = useMemo(
      () =>
        orderedResults.map((item) => {
          const typeLabel = item.type;
          const titlePlain = item.title;

          return {
            key: item.id,
            label: `${typeLabel}/${titlePlain}`,
            renderLabel: (
              <span css={smlMenuLabelStyles.root}>
                <span css={smlMenuLabelStyles.typeSegment}>
                  <EuiHighlight strict={false} search={type}>
                    {typeLabel}
                  </EuiHighlight>
                </span>
                <EuiHighlight strict={false} search={query.includes('/') ? '/' : ''}>
                  /
                </EuiHighlight>
                <EuiHighlight strict={false} search={titleHighlight}>
                  {titlePlain}
                </EuiHighlight>
              </span>
            ),
          };
        }),
      [orderedResults, query, titleHighlight, type, smlMenuLabelStyles]
    );

    const handleSelect = useCallback(
      (option: CommandMenuListOption) => {
        onSelect({
          commandId: CommandId.Sml,
          label: option.label,
          id: option.key,
          metadata: {},
        });
      },
      [onSelect]
    );

    // Tab completes the typed text as far as the results agree. It only selects a result when it is the only one.
    const handleTab = useCallback(() => {
      if (!onReplaceText || orderedResults.length <= 1) {
        return false;
      }
      const completion = getCompletion(query, orderedResults);
      if (completion !== undefined) {
        onReplaceText(completion);
      }
      return true;
    }, [query, orderedResults, onReplaceText]);

    return (
      <CommandMenuList
        ref={ref}
        options={options}
        isLoading={isLoading}
        onSelect={handleSelect}
        spaceSelection={spaceSelection}
        onTab={handleTab}
        data-test-subj="smlMenu"
      />
    );
  }
);
