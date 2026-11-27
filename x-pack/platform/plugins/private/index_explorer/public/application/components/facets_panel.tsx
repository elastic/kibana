/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { FacetResult, FieldInfo, SuggestedFacet } from '../../../common/types';
import { FACETABLE_TYPES } from '../../../common/types';
import { useServices } from '../services';
import { i18nTexts } from '../translations';
import { AppLink } from './app_link';

interface FacetsPanelProps {
  readonly fields: readonly FieldInfo[];
  readonly facets: readonly FacetResult[];
  readonly suggestedFacets: readonly SuggestedFacet[];
  /** Facets configured in kibana.yml are always shown and cannot be removed. */
  readonly pinnedFacets: readonly string[];
  readonly isValueSelected: (field: string, value: string) => boolean;
  readonly addFacetPath: (field: string) => string;
  readonly removeFacetPath: (field: string) => string;
  readonly toggleValuePath: (field: string, value: string) => string;
}

/** Suggested facets plus one panel of value counts per active facet. */
export function FacetsPanel({
  fields,
  facets,
  suggestedFacets,
  pinnedFacets,
  isValueSelected,
  addFacetPath,
  removeFacetPath,
  toggleValuePath,
}: FacetsPanelProps) {
  const { history } = useServices();
  const activeFacets = new Set(facets.map(({ field }) => field));
  const facetOptions = fields
    .filter(({ name, type }) => FACETABLE_TYPES.has(type) && !activeFacets.has(name))
    .map(({ name }) => ({ label: name, value: name }));

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false} css={{ minWidth: 240 }}>
          <EuiComboBox
            compressed
            aria-label={i18nTexts.facetByLabel}
            placeholder={i18nTexts.facetByLabel}
            singleSelection={{ asPlainText: true }}
            options={facetOptions}
            selectedOptions={[]}
            onChange={([selected]) => {
              if (selected?.value) {
                history.push(addFacetPath(selected.value));
              }
            }}
            data-test-subj="indexExplorerFacetBy"
          />
        </EuiFlexItem>
        {suggestedFacets.length > 0 ? (
          <EuiFlexItem>
            <EuiText size="s" data-test-subj="indexExplorerSuggestedFacets">
              <strong>{i18nTexts.suggestedFacets}</strong>{' '}
              {suggestedFacets.map(({ field, cardinality }, position) => (
                <React.Fragment key={field}>
                  {position > 0 ? ', ' : null}
                  <AppLink path={addFacetPath(field)}>{field}</AppLink>
                  <EuiText size="xs" color="subdued" component="span">
                    {` (${cardinality})`}
                  </EuiText>
                </React.Fragment>
              ))}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {facets.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={4} gutterSize="s">
            {facets.map(({ field, buckets, otherCount }) => (
              <EuiFlexItem key={field}>
                <EuiPanel hasBorder paddingSize="s" data-test-subj={`indexExplorerFacet-${field}`}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    <EuiFlexItem>
                      <EuiTitle size="xxs">
                        <h3>{field}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    {pinnedFacets.includes(field) ? null : (
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          content={i18nTexts.removeFacet(field)}
                          disableScreenReaderOutput
                        >
                          <EuiButtonIcon
                            iconType="cross"
                            size="xs"
                            color="text"
                            aria-label={i18nTexts.removeFacet(field)}
                            {...reactRouterNavigate(history, removeFacetPath(field))}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  <EuiSpacer size="xs" />
                  {buckets.length === 0 ? (
                    <EuiText size="xs" color="subdued">
                      {i18nTexts.noFacetValues}
                    </EuiText>
                  ) : null}
                  {buckets.map(({ value, label, count }) => (
                    <EuiFlexGroup
                      key={value}
                      gutterSize="s"
                      justifyContent="spaceBetween"
                      responsive={false}
                    >
                      <EuiFlexItem css={{ minWidth: 0 }}>
                        <EuiText size="xs" className="eui-textTruncate">
                          <AppLink path={toggleValuePath(field, value)}>
                            {isValueSelected(field, value) ? (
                              <strong>{`${label} ✕`}</strong>
                            ) : (
                              label || '""'
                            )}
                          </AppLink>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {count.toLocaleString()}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))}
                  {otherCount > 0 ? (
                    <EuiText size="xs" color="subdued">
                      {i18nTexts.otherFacetValues(otherCount)}
                    </EuiText>
                  ) : null}
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </>
      ) : null}
    </>
  );
}
