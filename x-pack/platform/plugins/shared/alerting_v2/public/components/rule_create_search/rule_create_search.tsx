/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiInputPopover,
  EuiLink,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSelectable,
  EuiText,
  useEuiScrollBar,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import { AiButtonEmpty } from '@kbn/ui-ai-components';
import { getSearchOptions } from './get_search_options';
import type { RuleCreateSearchOption, RuleCreateSearchOptionData } from './get_search_options';
import type { RuleCreateSearchSections } from './types';

const SEARCH_DEBOUNCE_MS = 300;

const SEARCH_LABEL = i18n.translate('xpack.alertingV2.ruleCreateSearch.searchLabel', {
  defaultMessage: 'What do you want to measure?',
});

const AGENT_FOOTER_TEXT = i18n.translate('xpack.alertingV2.ruleCreateSearch.agentFooterText', {
  defaultMessage: 'Build this rule with the agent',
});

const SEND_TO_AGENT_LABEL = i18n.translate('xpack.alertingV2.ruleCreateSearch.sendToAgentLabel', {
  defaultMessage: 'Send to Agent',
});

const SEND_TO_AGENT_HINT = i18n.translate('xpack.alertingV2.ruleCreateSearch.sendToAgentHint', {
  defaultMessage: 'Press Enter to send your text to the agent.',
});

const NO_RESULTS_MESSAGE = i18n.translate('xpack.alertingV2.ruleCreateSearch.noResultsMessage', {
  defaultMessage: 'No matching builders, templates, or Classic rule types',
});

const LOADING_LABEL = i18n.translate('xpack.alertingV2.ruleCreateSearch.sectionLoadingLabel', {
  defaultMessage: 'Loading results',
});

export interface RuleCreateSearchProps {
  /** Section results for the current debounced query. */
  sections: RuleCreateSearchSections;
  /** Called with the debounced, trimmed query. */
  onQueryChange: (query: string) => void;
  /** Sends the typed text to the agent. Omit to make the input search only. */
  onSendToAgent?: (text: string) => void;
}

/** Create rule search input with a results dropdown grouped by section and an optional agent footer. */
export const RuleCreateSearch = ({
  sections,
  onQueryChange,
  onSendToAgent,
}: RuleCreateSearchProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollBarStyles = useEuiScrollBar();
  const [value, setValue] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasActiveOption, setHasActiveOption] = useState(false);
  const agentHintId = useGeneratedHtmlId({ prefix: 'ruleCreateSearchAgentHint' });

  const trimmedValue = value.trim();
  const debouncedQuery = useDebouncedValue(trimmedValue, SEARCH_DEBOUNCE_MS);
  const isOpen = trimmedValue !== '' && !isDismissed;

  useEffect(() => {
    onQueryChange(debouncedQuery);
  }, [debouncedQuery, onQueryChange]);

  const groupLabelCss = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.s};
  `;

  const options = getSearchOptions(sections).map((option): RuleCreateSearchOption => {
    const { sectionId, item, isLoading, headerAction } = option.data;
    return option.isGroupLabel
      ? {
          ...option,
          css: groupLabelCss,
          append: isLoading ? (
            <EuiLoadingSpinner size="s" aria-label={LOADING_LABEL} />
          ) : headerAction ? (
            <EuiLink
              onClick={headerAction.onClick}
              data-test-subj={`ruleCreateSearchHeaderAction-${sectionId}`}
            >
              {headerAction.label}
            </EuiLink>
          ) : undefined,
        }
      : {
          ...option,
          prepend: item?.iconType ? <EuiIcon type={item.iconType} aria-hidden={true} /> : undefined,
          'data-test-subj': `ruleCreateSearchItem-${sectionId}-${item?.id}`,
        };
  });

  const descriptionsByKey = new Map(
    options.map(({ key, data }) => [key, data.item?.description] as const)
  );

  const sendToAgent = () => {
    if (!onSendToAgent || trimmedValue === '') {
      return;
    }
    onSendToAgent(trimmedValue);
  };

  const handleSearchChange = (searchValue: string) => {
    setValue(searchValue);
    setIsDismissed(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsDismissed(true);
      return;
    }
    if (event.key === 'Enter' && !hasActiveOption) {
      sendToAgent();
    }
  };

  const handleOptionChange = (
    _options: RuleCreateSearchOption[],
    _event: unknown,
    changedOption: RuleCreateSearchOption
  ) => {
    const { item } = changedOption.data;
    if (!item) {
      return;
    }
    setIsDismissed(true);
    item.onSelect();
  };

  const renderOption = ({ key, label }: RuleCreateSearchOption) => {
    const description = descriptionsByKey.get(key);
    return (
      <>
        <EuiText size="s">
          <strong>{label}</strong>
        </EuiText>
        {description ? (
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        ) : null}
      </>
    );
  };

  return (
    <EuiSelectable<{ data: RuleCreateSearchOptionData }>
      aria-label={SEARCH_LABEL}
      options={options}
      onChange={handleOptionChange}
      onActiveOptionChange={(option) => setHasActiveOption(option != null)}
      renderOption={renderOption}
      singleSelection={true}
      isPreFiltered={{ highlightSearch: false }}
      searchable={true}
      searchProps={{
        value,
        onChange: handleSearchChange,
        onKeyDown: handleSearchKeyDown,
        isClearable: true,
        fullWidth: true,
        'aria-label': SEARCH_LABEL,
        'aria-describedby': onSendToAgent ? agentHintId : undefined,
        'data-test-subj': 'ruleCreateSearchInput',
      }}
      listProps={{ isVirtualized: false, showIcons: false, bordered: false, textWrap: 'wrap' }}
      emptyMessage={NO_RESULTS_MESSAGE}
      noMatchesMessage={NO_RESULTS_MESSAGE}
      data-test-subj="ruleCreateSearch"
    >
      {(list, search) => (
        <>
          {onSendToAgent ? (
            <EuiScreenReaderOnly>
              <span id={agentHintId}>{SEND_TO_AGENT_HINT}</span>
            </EuiScreenReaderOnly>
          ) : null}
          <EuiInputPopover
          input={search ?? <></>}
          isOpen={isOpen}
          closePopover={() => setIsDismissed(true)}
          fullWidth={true}
          disableFocusTrap={true}
          panelPaddingSize="s"
          data-test-subj="ruleCreateSearchDropdown"
        >
          <div
            css={css`
              ${scrollBarStyles}
              max-height: 400px;
              overflow-y: auto;
            `}
          >
            {list}
          </div>
          {onSendToAgent ? (
            <>
              <EuiHorizontalRule margin="s" />
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {AGENT_FOOTER_TEXT}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <AiButtonEmpty
                    iconType="productAgent"
                    size="s"
                    onClick={sendToAgent}
                    data-test-subj="ruleCreateSearchSendToAgent"
                  >
                    {SEND_TO_AGENT_LABEL}
                  </AiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ) : null}
        </EuiInputPopover>
        </>
      )}
    </EuiSelectable>
  );
};
