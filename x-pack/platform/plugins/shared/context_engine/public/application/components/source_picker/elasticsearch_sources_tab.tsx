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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { getEbtProps } from '@kbn/ebt-click';
import { ESQLLangEditor } from '@kbn/esql/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useId, useMemo, useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useIndices } from '../../hooks/use_indices';

const EDITOR_INLINE_MIN_HEIGHT = 180;

const getEsqlQuery = (query: AggregateQuery): string => ('esql' in query ? query.esql : '');

interface ElasticsearchSourcesTabProps {
  enabled: boolean;
  onAddIndex: (indexName: string) => void;
  onAddEsql: (query: string) => void;
}

export const ElasticsearchSourcesTab = ({
  enabled,
  onAddIndex,
  onAddEsql,
}: ElasticsearchSourcesTabProps) => {
  const accordionId = useId();
  const [search, setSearch] = useState('');
  const [esqlQuery, setEsqlQuery] = useState('');
  const trimmedEsqlQuery = esqlQuery.trim();

  const { indexNames, isLoading, isError } = useIndices({ search, enabled });

  const indexOptions = useMemo<EuiComboBoxOptionOption<string>[]>(
    () => indexNames.map((name) => ({ label: name, value: name })),
    [indexNames]
  );

  const addIndexFromCombo = (indexName: string) => {
    const trimmed = indexName.trim();
    if (!trimmed) {
      return;
    }
    onAddIndex(trimmed);
    setSearch('');
  };

  const handleIndexChange = (nextSelectedOptions: EuiComboBoxOptionOption<string>[]) => {
    const picked = nextSelectedOptions[0]?.label;
    if (picked) {
      addIndexFromCombo(picked);
    }
  };

  const handleAddEsql = () => {
    if (!trimmedEsqlQuery) {
      return;
    }
    onAddEsql(trimmedEsqlQuery);
    setEsqlQuery('');
  };

  if (isError) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        data-test-subj="contextIndexTabError"
        title={
          <h3>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.index.errorTitle"
              defaultMessage="Unable to load indices"
            />
          </h3>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.index.errorBody"
              defaultMessage="Indices and data streams could not be loaded. Try again or check your permissions."
            />
          </p>
        }
      />
    );
  }

  return (
    <div data-test-subj="contextElasticsearchSourcesTab">
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
            defaultMessage="Start typing to search. Press Enter to add a wildcard pattern such as logs-*."
          />
        }
      >
        <EuiComboBox
          async
          fullWidth
          singleSelection={{ asPlainText: true }}
          selectedOptions={[]}
          isClearable={false}
          aria-label={i18n.translate('xpack.contextEngine.sourcePicker.index.comboAriaLabel', {
            defaultMessage: 'Select an index, data stream or alias',
          })}
          placeholder={i18n.translate('xpack.contextEngine.sourcePicker.index.comboPlaceholder', {
            defaultMessage: 'e.g. logs-nginx or logs-*',
          })}
          options={indexOptions}
          onChange={handleIndexChange}
          onCreateOption={addIndexFromCombo}
          onSearchChange={setSearch}
          isLoading={isLoading}
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
