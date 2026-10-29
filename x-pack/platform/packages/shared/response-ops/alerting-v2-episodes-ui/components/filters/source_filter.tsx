/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFilterButton, EuiIcon, EuiPopover, useEuiTheme } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { IconType } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import {
  EPISODE_SOURCE_FILTER_CLASSIC,
  EPISODE_SOURCE_FILTER_UNIVERSAL,
  isConnectorEpisodeSource,
} from '@kbn/alerting-v2-common-queries';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import {
  useAdditionalEpisodesDataSource,
  useQueryV2Source,
} from '../../context/episode_data_source_context';
import { useFetchEpisodeConnectorSources } from '../../hooks/use_fetch_episode_connector_sources';
import { useEpisodeSource } from '../../source_labels';
import { InlineFilterPopover } from './inline_filter_popover';
import * as i18n from './translations';

interface SourceFilterOption {
  label: string;
  value: string;
  prepend?: React.ReactNode;
}

const sourceIcon = (icon: IconType | undefined): React.ReactNode =>
  icon ? <EuiIcon type={icon} size="m" aria-hidden={true} /> : undefined;

const connectorIcon = (source: string): React.ReactNode => {
  const IconComponent = ConnectorIconsMap.get(`.${source}`);
  if (!IconComponent) {
    return undefined;
  }
  return (
    <Suspense fallback={null}>
      <EuiIcon type={IconComponent} size="m" aria-hidden={true} />
    </Suspense>
  );
};

interface AlertEpisodesSourceFilterProps {
  selectedSources?: string[] | null;
  onSourcesChange: (sources: string[] | undefined) => void;
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart };
  timeRange: TimeRange;
  'data-test-subj'?: string;
}

export function AlertEpisodesSourceFilter({
  selectedSources,
  onSourcesChange,
  services,
  timeRange,
  'data-test-subj': dataTestSubj = 'sourceFilter',
}: AlertEpisodesSourceFilterProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const hasClassic = useAdditionalEpisodesDataSource()?.id === EPISODE_SOURCE_FILTER_CLASSIC;
  const hasUniversal = useQueryV2Source();
  const {
    data: connectorSources = [],
    isLoading,
    isError,
  } = useFetchEpisodeConnectorSources({
    services,
    timeRange,
  });
  const universalSource = useEpisodeSource(EPISODE_SOURCE_FILTER_UNIVERSAL);
  const classicSource = useEpisodeSource(EPISODE_SOURCE_FILTER_CLASSIC);

  const allOptions = useMemo(() => {
    const systemOptions: SourceFilterOption[] = [
      ...(hasUniversal
        ? [
            {
              label: universalSource.label,
              value: EPISODE_SOURCE_FILTER_UNIVERSAL,
              prepend: sourceIcon(universalSource.icon),
            },
          ]
        : []),
      ...(hasClassic
        ? [
            {
              label: classicSource.label,
              value: EPISODE_SOURCE_FILTER_CLASSIC,
              prepend: sourceIcon(classicSource.icon),
            },
          ]
        : []),
    ];
    const connectorOptions = connectorSources.map((source) => ({
      label: source,
      value: source,
      prepend: connectorIcon(source),
    }));
    const knownValues = new Set<string>(systemOptions.map((option) => option.value));
    for (const source of connectorSources) {
      knownValues.add(source);
    }
    const missingSelected = (selectedSources ?? [])
      .filter((source) => isConnectorEpisodeSource(source) && !knownValues.has(source))
      .map((source) => ({
        label: source,
        value: source,
        prepend: connectorIcon(source),
      }));
    return [...systemOptions, ...missingSelected, ...connectorOptions];
  }, [
    classicSource.icon,
    classicSource.label,
    connectorSources,
    hasClassic,
    hasUniversal,
    selectedSources,
    universalSource.icon,
    universalSource.label,
  ]);

  const options = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return allOptions;
    }
    return allOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [allOptions, search]);

  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onSourcesChange(values.length > 0 ? values : undefined);
    },
    [onSourcesChange]
  );

  const selectedValues = selectedSources ?? [];
  const activeCount = selectedValues.length;

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  return (
    <EuiPopover
      aria-label={i18n.SOURCE_FILTER_ARIA_LABEL}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => {
            setIsOpen((open) => {
              if (open) {
                setSearch('');
              }
              return !open;
            });
          }}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numFilters={allOptions.length}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          data-test-subj={`${dataTestSubj}-button`}
        >
          {i18n.SOURCE_FILTER_LABEL}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      {isError ? (
        <div
          css={css`
            padding: ${euiTheme.size.s};
          `}
        >
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.SOURCE_FILTER_LOAD_ERROR}
            data-test-subj={`${dataTestSubj}-error`}
          />
        </div>
      ) : null}
      <InlineFilterPopover
        options={options}
        selectedValues={selectedValues}
        singleSelect={false}
        onSelectionChange={handleSelectionChange}
        searchable={true}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={i18n.SOURCE_FILTER_SEARCH_PLACEHOLDER}
        emptyMessage={i18n.SOURCE_FILTER_NO_MATCH}
        isLoading={isLoading}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
