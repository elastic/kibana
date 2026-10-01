/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { getEbtProps } from '@kbn/ebt-click';
import { ESQLLangEditor } from '@kbn/esql/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useId, useMemo, useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useIndices } from '../../hooks/use_indices';
import { isIndexPickerSourceSelected } from '../../utils/sources';
import type { SelectedSource } from './types';

const EDITOR_INLINE_MIN_HEIGHT = 180;
const SEARCH_DEBOUNCE_MS = 300;

const getEsqlQuery = (query: AggregateQuery): string => ('esql' in query ? query.esql : '');

interface ElasticsearchSourcesTabProps {
  selectedSources: SelectedSource[];
  onAddIndex: (indexName: string) => void;
  onAddEsql: (query: string) => void;
}

export const ElasticsearchSourcesTab = ({
  selectedSources,
  onAddIndex,
  onAddEsql,
}: ElasticsearchSourcesTabProps) => {
  const accordionId = useId();
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const [hasFocused, setHasFocused] = useState(false);
  const [esqlQuery, setEsqlQuery] = useState('');
  const trimmedEsqlQuery = esqlQuery.trim();

  const { indexNames, isFetching } = useIndices({
    search: debouncedSearch.trim(),
    enabled: hasFocused,
  });

  const indexOptions = useMemo<EuiComboBoxOptionOption<string>[]>(
    () =>
      indexNames
        .filter((name) => !isIndexPickerSourceSelected(selectedSources, name))
        .map((name) => ({ label: name, value: name })),
    [indexNames, selectedSources]
  );

  const addIndexFromCombo = (indexName: string) => {
    const trimmed = indexName.trim();
    if (!trimmed) {
      return;
    }
    onAddIndex(trimmed);
    setSearchValue('');
  };

  const handleIndexChange = (nextSelectedOptions: EuiComboBoxOptionOption<string>[]) => {
    const picked = nextSelectedOptions[0]?.value;
    if (picked) {
      addIndexFromCombo(picked);
    }
  };

  const handleFocus = () => {
    setHasFocused(true);
  };

  const handleAddEsql = () => {
    if (!trimmedEsqlQuery) {
      return;
    }
    onAddEsql(trimmedEsqlQuery);
    setEsqlQuery('');
  };

  return (
    <div data-test-subj="contextElasticsearchSourcesTab">
      <EuiProgress
        size="xs"
        color="accent"
        css={{ visibility: isFetching ? 'visible' : 'hidden' }}
        data-test-subj="contextIndexComboBoxLoadingBar"
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.index.fieldLabel"
            defaultMessage="Index, data stream or alias"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.index.fieldHelp"
            defaultMessage="Start typing to search, then select a match from the list."
          />
        }
      >
        <EuiComboBox
          async
          fullWidth
          singleSelection={{ asPlainText: true }}
          sortMatchesBy="startsWith"
          selectedOptions={[]}
          isClearable={false}
          aria-label={i18n.translate('xpack.contextEngine.sourcePicker.index.comboAriaLabel', {
            defaultMessage: 'Select an index, data stream or alias',
          })}
          placeholder={i18n.translate('xpack.contextEngine.sourcePicker.index.comboPlaceholder', {
            defaultMessage: 'e.g. logs-nginx',
          })}
          options={indexOptions}
          onChange={handleIndexChange}
          onSearchChange={setSearchValue}
          onFocus={handleFocus}
          data-test-subj="contextIndexComboBox"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={accordionId}
        data-test-subj="contextAdvancedEsqlAccordion"
        buttonProps={{ 'data-test-subj': 'contextAdvancedEsqlAccordionButton' }}
        buttonContent={
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.advancedEsqlAccordion"
            defaultMessage="Advanced: ES|QL"
          />
        }
        paddingSize="m"
      >
        <div data-test-subj="contextEsqlTab">
          <EuiFormRow fullWidth>
            <div css={{ minHeight: EDITOR_INLINE_MIN_HEIGHT }}>
              <ESQLLangEditor
                query={{ esql: esqlQuery }}
                onTextLangQueryChange={(next) => setEsqlQuery(getEsqlQuery(next))}
                onTextLangQuerySubmit={async () => {}}
                editorIsInline
                hasOutline
                hideRunQueryButton
                hideQueryHistory
                expandToFitQueryOnMount
                isLoading={false}
              />
            </div>
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plusCircle"
                onClick={handleAddEsql}
                isDisabled={!trimmedEsqlQuery}
                data-test-subj="contextAddEsqlSourceButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexEditFlyoutSourcePicker,
                  action: CONTEXT_ENGINE_UI_EBT.action.sources.ADD_ESQL,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.sourcePicker.esql.addButton"
                  defaultMessage="Add ES|QL source"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiAccordion>
    </div>
  );
};
