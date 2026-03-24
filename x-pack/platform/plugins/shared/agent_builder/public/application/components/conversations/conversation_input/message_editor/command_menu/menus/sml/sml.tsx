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
import type { CommandMenuComponentProps, CommandMenuHandle } from '../../types';
import { CommandId } from '../../types';
import { getSmlCommandMenuHighlightNeedles } from '../../../../../../../../../common/sml_search_highlight_segments';
import { CommandMenuList } from '../components/command_menu_list';
import type { CommandMenuListOption } from '../components/command_menu_list';

export const Sml = forwardRef<CommandMenuHandle, CommandMenuComponentProps>(
  ({ query, onSelect }, ref) => {
    const { euiTheme } = useEuiTheme();
    const { results, isLoading } = useSmlSearch(query);
    const { titleSearch, typeSearch } = useMemo(
      () => getSmlCommandMenuHighlightNeedles(query),
      [query]
    );

    const options: CommandMenuListOption[] = useMemo(
      () =>
        results.map((item) => {
          const typeLabel = item.attachment_type;
          const titlePlain = item.title;
          const accessibilityLabel = `${typeLabel}/${titlePlain}`;

          return {
            key: item.chunk_id,
            label: accessibilityLabel,
            renderLabel: (
              <span
                css={css`
                  word-break: break-word;
                `}
              >
                <span
                  css={css`
                    font-weight: ${euiTheme.font.weight.medium};
                  `}
                >
                  <EuiHighlight strict={false} search={typeSearch}>
                    {typeLabel}
                  </EuiHighlight>
                </span>
                <span>/</span>

                <EuiHighlight strict={false} search={titleSearch}>
                  {titlePlain}
                </EuiHighlight>
              </span>
            ),
          };
        }),
      [euiTheme.font.weight.medium, results, titleSearch, typeSearch]
    );

    const resultByKey = useMemo(() => new Map(results.map((r) => [r.chunk_id, r])), [results]);

    const handleSelect = useCallback(
      (option: CommandMenuListOption) => {
        const item = resultByKey.get(option.key);
        const typeLabel = item?.attachment_type ?? '';
        const titlePlain = item?.title ?? option.label;
        onSelect({
          commandId: CommandId.Sml,
          label: `${typeLabel}/${titlePlain}`,
          id: option.key,
          metadata: {},
        });
      },
      [onSelect, resultByKey]
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
