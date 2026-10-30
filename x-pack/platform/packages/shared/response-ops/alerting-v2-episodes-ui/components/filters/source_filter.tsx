/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFilterButton, EuiIcon, EuiPopover, EuiText, useEuiTheme } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { IconType } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import {
  EPISODE_SOURCE_FILTER_CLASSIC,
  EPISODE_SOURCE_FILTER_UNIVERSAL,
  isConnectorEpisodeSource,
  isEpisodeSourceFilterSystemId,
} from '@kbn/alerting-v2-common-queries';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import {
  useAdditionalEpisodesDataSource,
  useQueryV2Source,
} from '../../context/episode_data_source_context';
import { CLASSIC_EPISODE_SOURCE_ID } from '../../classic_alerts/constants';
import { ALERTING_V2_EPISODE_SOURCE_ID } from '../../constants';
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

const EMPTY_SOURCES: string[] = [];

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
  const hasClassic = useAdditionalEpisodesDataSource()?.id === CLASSIC_EPISODE_SOURCE_ID;
  const hasUniversal = useQueryV2Source();
  const {
    data: connectorSourceResult,
    isLoading,
    isError,
  } = useFetchEpisodeConnectorSources({
    services,
    timeRange,
  });
  const connectorSources = connectorSourceResult?.sources ?? EMPTY_SOURCES;
  const connectorSourcesTruncated = connectorSourceResult?.truncated ?? false;
  const universalSource = useEpisodeSource(ALERTING_V2_EPISODE_SOURCE_ID);
  const classicSource = useEpisodeSource(CLASSIC_EPISODE_SOURCE_ID);
  const selectedValues = selectedSources ?? EMPTY_SOURCES;

  const allOptions = useMemo(() => {
    const universalOption: SourceFilterOption = {
      label: universalSource.label,
      value: EPISODE_SOURCE_FILTER_UNIVERSAL,
      prepend: sourceIcon(universalSource.icon),
    };
    const classicOption: SourceFilterOption = {
      label: classicSource.label,
      value: EPISODE_SOURCE_FILTER_CLASSIC,
      prepend: sourceIcon(classicSource.icon),
    };
    const selectedSet = new Set(selectedValues);
    const systemOptions: SourceFilterOption[] = [
      ...(hasUniversal || selectedSet.has(EPISODE_SOURCE_FILTER_UNIVERSAL)
        ? [universalOption]
        : []),
      ...(hasClassic || selectedSet.has(EPISODE_SOURCE_FILTER_CLASSIC) ? [classicOption] : []),
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
    const missingSelected = selectedValues
      .filter(
        (source) =>
          !isEpisodeSourceFilterSystemId(source) &&
          isConnectorEpisodeSource(source) &&
          !knownValues.has(source)
      )
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
    selectedValues,
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
      const visible = new Set(options.map((option) => option.value));
      const hiddenSelected = selectedValues.filter((source) => !visible.has(source));
      const next = [...hiddenSelected, ...values];
      onSourcesChange(next.length > 0 ? next : undefined);
    },
    [onSourcesChange, options, selectedValues]
  );

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
      {connectorSourcesTruncated ? (
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            padding: ${euiTheme.size.s};
          `}
          data-test-subj={`${dataTestSubj}-truncated`}
        >
          <p>{i18n.SOURCE_FILTER_TRUNCATED}</p>
        </EuiText>
      ) : null}
    </EuiPopover>
  );
}
