/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { styles as toolbarStyles } from '@kbn/unified-data-table/src/components/custom_toolbar/render_custom_toolbar';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { OpenInDiscover } from '../category_table/use_open_in_discover';
import { EmbeddableMenu } from './embeddable_menu';
import type { RandomSampler } from '../sampling_menu';
import { SelectedPatterns } from './selected_patterns';
import { CreateCategorizationJobButton } from '../create_categorization_job';
import { SelectedField } from './field_selector';
import type { MinimumTimeRangeOption } from '../../../../common/embeddables/pattern_analysis/types';

interface Props {
  renderViewModeToggle: (patternCount?: number) => React.ReactElement;
  randomSampler: RandomSampler;
  openInDiscover: OpenInDiscover;
  selectedCategories: Category[];
  loadCategories: () => void;
  fields: DataViewField[];
  setSelectedField: React.Dispatch<React.SetStateAction<DataViewField | null>>;
  selectedField: DataViewField | null;
  minimumTimeRangeOption: MinimumTimeRangeOption;
  setMinimumTimeRangeOption: (w: MinimumTimeRangeOption) => void;
  dataview: DataView;
  earliest: number | undefined;
  latest: number | undefined;
  query: QueryDslQueryContainer;
  data: {
    categories: Category[];
    displayExamples: boolean;
    totalCategories: number;
  } | null;
  refiningLoading: boolean;
  onRefineWithAI: (connectorId: string) => void;
  connectors: Array<{ connectorId: string; name: string }>;
  selectedConnectorId: string | null;
  setSelectedConnectorId: (id: string | null) => void;
}

export const DiscoverTabs: FC<Props> = ({
  renderViewModeToggle,
  randomSampler,
  openInDiscover,
  selectedCategories,
  loadCategories,
  fields,
  setSelectedField,
  selectedField,
  minimumTimeRangeOption,
  setMinimumTimeRangeOption,
  data,
  dataview,
  earliest,
  latest,
  query,
  refiningLoading,
  onRefineWithAI,
  connectors,
  selectedConnectorId,
  setSelectedConnectorId,
}) => {
  const canRefine =
    (data?.categories?.length ?? 0) > 0 && connectors.length > 0 && selectedConnectorId !== null;

  return (
    <EuiFlexItem grow={false} className="unifiedDataTableToolbar" css={toolbarStyles.toolbar}>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>{renderViewModeToggle(data?.categories.length)}</EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            {selectedCategories.length > 0 ? (
              <EuiFlexItem grow={false}>
                <SelectedPatterns openInDiscover={openInDiscover} />
              </EuiFlexItem>
            ) : null}
            {canRefine ? (
              <>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    compressed
                    options={connectors.map((c) => ({
                      value: c.connectorId,
                      text: c.name,
                    }))}
                    value={selectedConnectorId ?? ''}
                    onChange={(e) => setSelectedConnectorId(e.target.value || null)}
                    aria-label={i18n.translate(
                      'xpack.aiops.logCategorization.connectorSelectAria',
                      { defaultMessage: 'Inference connector' }
                    )}
                    data-test-subj="aiopsLogPatternsConnectorSelect"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    onClick={() => selectedConnectorId && onRefineWithAI(selectedConnectorId)}
                    isLoading={refiningLoading}
                    isDisabled={!selectedConnectorId}
                    data-test-subj="aiopsLogPatternsFindImportantButton"
                  >
                    {i18n.translate('xpack.aiops.logCategorization.findImportantPatterns', {
                      defaultMessage: 'Find important patterns',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </>
            ) : null}
            <EuiFlexItem grow={false}>
              <SelectedField
                fields={fields}
                setSelectedField={setSelectedField}
                selectedField={selectedField}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div className="unifiedDataTableToolbarControlGroup" css={toolbarStyles.controlGroup}>
                <div
                  className="unifiedDataTableToolbarControlIconButton"
                  css={toolbarStyles.controlGroupIconButton}
                >
                  <EmbeddableMenu
                    randomSampler={randomSampler}
                    reload={() => loadCategories()}
                    minimumTimeRangeOption={minimumTimeRangeOption}
                    setMinimumTimeRangeOption={setMinimumTimeRangeOption}
                    categoryCount={data?.totalCategories}
                  />
                </div>
                {selectedField !== null && earliest !== undefined && latest !== undefined ? (
                  <div
                    className="unifiedDataTableToolbarControlIconButton"
                    css={toolbarStyles.controlGroupIconButton}
                  >
                    <CreateCategorizationJobButton
                      dataView={dataview}
                      field={selectedField}
                      query={query}
                      earliest={earliest}
                      latest={latest}
                      iconOnly={true}
                    />
                  </div>
                ) : null}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
