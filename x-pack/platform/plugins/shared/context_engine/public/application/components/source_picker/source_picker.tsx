/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import type { EsqlView } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { useEsqlViews } from '../../hooks/use_esql_views';
import { ConnectorsTab } from './connectors_tab';
import { EsqlViewsTab } from './esql_views_tab';
import type { SelectedSource } from './types';

type TabId = 'esqlViews' | 'connectors';

interface SourcePickerProps {
  selectedSources: SelectedSource[];
  onChange: (sources: SelectedSource[]) => void;
}

export const SourcePicker = ({ selectedSources, onChange }: SourcePickerProps) => {
  const [selectedTab, setSelectedTab] = useState<TabId>('esqlViews');
  const { views, isLoading } = useEsqlViews();

  const selectedEsqlViewIds = useMemo(
    () =>
      new Set(
        selectedSources.filter((source) => source.type === 'esql_view').map((source) => source.id)
      ),
    [selectedSources]
  );

  const toggleEsqlView = (view: EsqlView) => {
    if (selectedEsqlViewIds.has(view.name)) {
      onChange(
        selectedSources.filter(
          (current) => !(current.type === 'esql_view' && current.id === view.name)
        )
      );
      return;
    }
    onChange([
      ...selectedSources,
      { type: 'esql_view', id: view.name, label: view.name, value: view.query },
    ]);
  };

  const removeSource = (source: SelectedSource) => {
    onChange(
      selectedSources.filter(
        (current) => !(current.type === source.type && current.id === source.id)
      )
    );
  };

  return (
    <div data-test-subj="contextSourcePicker">
      {selectedSources.length > 0 && (
        <>
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {selectedSources.map((source) => (
              <EuiFlexItem grow={false} key={`${source.type}-${source.id}`}>
                <EuiBadge
                  color="hollow"
                  iconType="cross"
                  iconSide="right"
                  data-test-subj={`contextSelectedSource-${source.id}`}
                  iconOnClick={() => removeSource(source)}
                  iconOnClickAriaLabel={i18n.translate(
                    'xpack.contextEngine.sourcePicker.removeSourceAriaLabel',
                    {
                      defaultMessage: 'Remove {label}',
                      values: { label: source.label },
                    }
                  )}
                >
                  {source.label}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiTabs data-test-subj="contextSourcePickerTabs">
        <EuiTab
          isSelected={selectedTab === 'esqlViews'}
          onClick={() => setSelectedTab('esqlViews')}
          prepend={<EuiIcon type="editorCodeBlock" aria-hidden={true} />}
          append={
            selectedEsqlViewIds.size > 0 ? (
              <EuiNotificationBadge>{selectedEsqlViewIds.size}</EuiNotificationBadge>
            ) : undefined
          }
          data-test-subj="contextSourcePickerTab-esqlViews"
        >
          {i18n.translate('xpack.contextEngine.sourcePicker.tabs.esqlViews', {
            defaultMessage: 'ES|QL Views',
          })}
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === 'connectors'}
          onClick={() => setSelectedTab('connectors')}
          prepend={<EuiIcon type="plugs" aria-hidden={true} />}
          data-test-subj="contextSourcePickerTab-connectors"
        >
          {i18n.translate('xpack.contextEngine.sourcePicker.tabs.connectors', {
            defaultMessage: 'Connectors',
          })}
        </EuiTab>
      </EuiTabs>

      <EuiSpacer size="m" />

      {selectedTab === 'esqlViews' ? (
        <EsqlViewsTab
          views={views}
          isLoading={isLoading}
          selectedIds={selectedEsqlViewIds}
          onToggle={toggleEsqlView}
        />
      ) : (
        <ConnectorsTab />
      )}
    </div>
  );
};
