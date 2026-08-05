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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import { ConnectorsTab } from './connectors_tab';
import { EsqlTab } from './esql_tab';
import type { SelectedSource } from './types';

type TabId = 'esql' | 'connectors';

interface SourcePickerProps {
  selectedSources: SelectedSource[];
  onChange: (sources: SelectedSource[]) => void;
}

export const SourcePicker = ({ selectedSources, onChange }: SourcePickerProps) => {
  const [selectedTab, setSelectedTab] = useState<TabId>('esql');

  const selectedEsqlCount = useMemo(
    () => selectedSources.filter((source) => source.type === 'esql').length,
    [selectedSources]
  );

  const addEsqlSource = (query: string) => {
    if (selectedSources.some((current) => current.type === 'esql' && current.id === query)) {
      return;
    }
    onChange([...selectedSources, { type: 'esql', id: query, label: query, value: query }]);
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
                  // Cap the width so a long ES|QL query truncates instead of
                  // stretching the badge across the modal.
                  css={{ maxWidth: 260 }}
                  title={source.label}
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
          isSelected={selectedTab === 'esql'}
          onClick={() => setSelectedTab('esql')}
          prepend={<EuiIcon type="console" aria-hidden={true} />}
          append={
            selectedEsqlCount > 0 ? (
              <EuiNotificationBadge>{selectedEsqlCount}</EuiNotificationBadge>
            ) : undefined
          }
          data-test-subj="contextSourcePickerTab-esql"
        >
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.tabs.esql"
            defaultMessage="ES|QL"
          />
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === 'connectors'}
          onClick={() => setSelectedTab('connectors')}
          prepend={<EuiIcon type="plugs" aria-hidden={true} />}
          data-test-subj="contextSourcePickerTab-connectors"
        >
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.tabs.connectors"
            defaultMessage="Connectors"
          />
        </EuiTab>
      </EuiTabs>

      <EuiSpacer size="m" />

      {selectedTab === 'esql' && <EsqlTab onAdd={addEsqlSource} />}
      {selectedTab === 'connectors' && <ConnectorsTab />}
    </div>
  );
};
