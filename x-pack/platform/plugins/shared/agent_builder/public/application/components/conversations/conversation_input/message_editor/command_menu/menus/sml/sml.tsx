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

export const Sml = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect, onContentChange }, ref) => {
    const agentId = useAgentId();
    const { agent } = useAgentBuilderAgentById(agentId);
    const constraints = useMemo(() => buildSmlScopingFromAgent(agent), [agent]);
    const { euiTheme } = useEuiTheme();
    const { results, isLoading } = useSmlAutocomplete(query, { constraints });
    const { type, title } = useMemo(() => getSmlMenuHighlightSearchStrings(query), [query]);
    const canSelectOnSpace = query.includes('/') && title.length > 0;

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
                <span>/</span>
                <EuiHighlight strict={false} search={title}>
                  {titlePlain}
                </EuiHighlight>
              </span>
            ),
          };
        }),
      [orderedResults, title, type, smlMenuLabelStyles]
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

    return (
      <CommandMenuList
        ref={ref}
        options={options}
        isLoading={isLoading}
        onSelect={handleSelect}
        spaceSelection={spaceSelection}
        data-test-subj="smlMenu"
      />
    );
  }
);
