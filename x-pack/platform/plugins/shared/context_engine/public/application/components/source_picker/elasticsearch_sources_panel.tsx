/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { getEbtProps } from '@kbn/ebt-click';
import { ESQLLangEditor } from '@kbn/esql/public';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useId, useState } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { isIndexPickerSourceSelected } from '../../utils/sources';
import { IndexMultiSelect } from './index_multi_select';
import type { SelectedSource } from './types';

const EDITOR_INLINE_MIN_HEIGHT = 180;

const getEsqlQuery = (query: AggregateQuery): string => ('esql' in query ? query.esql : '');

interface ElasticsearchSourcesPanelProps {
  selectedSources: SelectedSource[];
  onAddIndex: (indexName: string) => void;
  onAddEsql: (query: string) => void;
  disabled?: boolean;
}

export const ElasticsearchSourcesPanel = ({
  selectedSources,
  onAddIndex,
  onAddEsql,
  disabled = false,
}: ElasticsearchSourcesPanelProps) => {
  const accordionId = useId();
  const [esqlQuery, setEsqlQuery] = useState('');
  const trimmedEsqlQuery = esqlQuery.trim();
  const isIndexSelected = useCallback(
    (indexName: string) => isIndexPickerSourceSelected(selectedSources, indexName),
    [selectedSources]
  );
  const handleAddEsql = () => {
    if (!trimmedEsqlQuery) {
      return;
    }
    onAddEsql(trimmedEsqlQuery);
    setEsqlQuery('');
  };

  return (
    <div data-test-subj="contextElasticsearchSourcesPanel">
      <IndexMultiSelect
        isIndexSelected={isIndexSelected}
        onSelect={onAddIndex}
        disabled={disabled}
      />

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
        <div data-test-subj="contextAdvancedEsqlEditor">
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
                isDisabled={!trimmedEsqlQuery || disabled}
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
