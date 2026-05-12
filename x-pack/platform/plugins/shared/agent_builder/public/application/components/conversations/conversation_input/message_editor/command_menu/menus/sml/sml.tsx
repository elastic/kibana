/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiHighlight, useEuiTheme } from '@elastic/eui';
import { useSmlSearch } from '../../../../../../../hooks/sml/use_sml_search';
import { useAgentId } from '../../../../../../../hooks/use_conversation';
import { useAgentBuilderAgentById } from '../../../../../../../hooks/agents/use_agent_by_id';
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { CommandId } from '../../types';
import { getSmlMenuHighlightSearchStrings } from '../../utils/sml_command_menu_highlight';
import { buildSmlFiltersFromAgent } from '../../utils/sml_filters';
import { CommandMenuList } from '../components/command_menu_list';
import type { CommandMenuListOption } from '../components/command_menu_list';

export const Sml = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect }, ref) => {
    const agentId = useAgentId();
    const { agent } = useAgentBuilderAgentById(agentId);
    const filters = useMemo(() => buildSmlFiltersFromAgent(agent), [agent]);
    const { euiTheme } = useEuiTheme();
    const { results, isLoading } = useSmlSearch(query, { skipContent: true, filters });
    const { type, title } = useMemo(() => getSmlMenuHighlightSearchStrings(query), [query]);

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
        results.map((item) => {
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
      [results, title, type, smlMenuLabelStyles]
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
        data-test-subj="smlMenu"
      />
    );
  }
);
