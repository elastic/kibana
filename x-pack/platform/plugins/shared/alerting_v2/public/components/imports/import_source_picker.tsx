/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiCard,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConnectorTypeIcon } from './connector_type_icon';
import { filterImportSources, IMPORT_SOURCE_SEARCH_THRESHOLD } from './import_sources';
import type { ImportSource } from './import_sources';

interface ImportSourcePickerProps {
  sources: ImportSource[];
  isLoading?: boolean;
  onSelect: (source: ImportSource) => void;
}

const descriptionCss = css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
`;

const isSelectable = (source: ImportSource) =>
  source.kind !== 'comingSoon' && source.disabledReason === undefined;

const SourceBadges = ({ source }: { source: ImportSource }) => {
  if (source.kind === 'comingSoon') {
    return (
      <EuiBadge color="hollow" data-test-subj={`importsSourceBadge-${source.id}-comingSoon`}>
        {i18n.translate('xpack.alertingV2.imports.picker.comingSoon.badge', {
          defaultMessage: 'Coming soon',
        })}
      </EuiBadge>
    );
  }
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
      {source.isTechnicalPreview && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="flask">
            {i18n.translate('xpack.alertingV2.imports.picker.technicalPreview', {
              defaultMessage: 'Technical preview',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {source.disabledReason && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={source.disabledReason}>
            <EuiBadge
              color="warning"
              tabIndex={0}
              data-test-subj={`importsSourceBadge-${source.id}-license`}
            >
              {i18n.translate('xpack.alertingV2.imports.picker.licenseBadge', {
                defaultMessage: 'License required',
              })}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/** The first step of "Set up import": where the alerts come from. */
export const ImportSourcePicker = ({
  sources,
  isLoading = false,
  onSelect,
}: ImportSourcePickerProps) => {
  const [search, setSearch] = useState('');
  const visibleSources = useMemo(() => filterImportSources(sources, search), [sources, search]);
  const showSearch = sources.length > IMPORT_SOURCE_SEARCH_THRESHOLD;

  return (
    <div data-test-subj="importsSourcePicker">
      {showSearch && (
        <>
          <EuiFieldSearch
            fullWidth
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={i18n.translate('xpack.alertingV2.imports.picker.searchPlaceholder', {
              defaultMessage: 'Search sources',
            })}
            aria-label={i18n.translate('xpack.alertingV2.imports.picker.searchAriaLabel', {
              defaultMessage: 'Search import sources',
            })}
            data-test-subj="importsSourceSearch"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {visibleSources.length === 0 ? (
        <EuiEmptyPrompt
          titleSize="xs"
          iconType="magnify"
          title={
            <h3>
              {i18n.translate('xpack.alertingV2.imports.picker.noMatches', {
                defaultMessage: 'No sources match your search',
              })}
            </h3>
          }
          data-test-subj="importsSourceNoMatches"
        />
      ) : (
        <EuiFlexGrid columns={2} gutterSize="m">
          {visibleSources.map((source) => (
            <EuiFlexItem key={source.id}>
              <EuiCard
                layout="vertical"
                textAlign="left"
                titleSize="xs"
                icon={
                  source.kind === 'custom' ? (
                    <EuiIcon type="link" size="xl" aria-hidden={true} />
                  ) : (
                    <ConnectorTypeIcon connectorTypeId={source.iconConnectorTypeId} size="xl" />
                  )
                }
                title={source.title}
                titleElement="h3"
                description={<span css={descriptionCss}>{source.description}</span>}
                footer={<SourceBadges source={source} />}
                isDisabled={!isSelectable(source)}
                onClick={isSelectable(source) ? () => onSelect(source) : undefined}
                data-test-subj={`importsSourceCard-${source.id}`}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      )}
      {isLoading && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" data-test-subj="importsSourcePickerLoading" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};
