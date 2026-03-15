/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiIconTip, EuiText, EuiTextColor, useEuiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';

import type { MappingsResponse } from '../../../../../../../common';
import { OverviewCard } from './overview_card';
import { countVectorBasedTypesFromMappings } from './mappings_convertor';

export interface AISearchQuickStatProps {
  mappings: MappingsResponse;
}

export const AISearchQuickStats = ({ mappings }: AISearchQuickStatProps) => {
  const largeFontSize = useEuiFontSize('l').fontSize;

  const { mappingStats, vectorFieldCount } = useMemo(() => {
    const stats = countVectorBasedTypesFromMappings(mappings);
    const vectorFields = stats.sparse_vector + stats.dense_vector + stats.semantic_text;
    return { mappingStats: stats, vectorFieldCount: vectorFields };
  }, [mappings]);

  if (vectorFieldCount === 0) {
    return null;
  }

  const semanticFields = mappingStats.semantic_text;
  const denseVectorFields = mappingStats.dense_vector;
  const sparseVectorFields = mappingStats.sparse_vector;

  return (
    <OverviewCard
      data-test-subj="indexDetailsStatsServerless"
      title={i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.aiSearch.cardTitle', {
        defaultMessage: 'AI Search',
      })}
      content={{
        left: (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiIconTip
              aria-label={i18n.translate(
                'xpack.idxMgmt.indexDetails.overviewTab.aiSearch.semanticText.iconLabel',
                {
                  defaultMessage: 'Semantic text fields',
                }
              )}
              size="l"
              type="tokenSemanticText"
              color="subdued"
              content={i18n.translate(
                'xpack.idxMgmt.indexDetails.overviewTab.aiSearch.semanticText.iconLabel',
                {
                  defaultMessage: 'Semantic text fields',
                }
              )}
            />
            <EuiText
              css={css`
                font-size: ${largeFontSize};
              `}
            >
              {semanticFields}
            </EuiText>
            <EuiTextColor color="subdued">
              {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.aiSearch.semanticFields', {
                defaultMessage: '{semanticFields, plural, one {Field} other {Fields}}',
                values: {
                  semanticFields,
                },
              })}
            </EuiTextColor>
          </EuiFlexGroup>
        ),
        center: (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiIconTip
              aria-label={i18n.translate(
                'xpack.idxMgmt.indexDetails.overviewTab.aiSearch.denseVector.iconLabel',
                {
                  defaultMessage: 'Dense vector fields',
                }
              )}
              size="l"
              type="tokenVectorDense"
              color="subdued"
              content={i18n.translate(
                'xpack.idxMgmt.indexDetails.overviewTab.aiSearch.denseVector.iconLabel',
                {
                  defaultMessage: 'Dense vector fields',
                }
              )}
            />
            <EuiText
              css={css`
                font-size: ${largeFontSize};
              `}
            >
              {denseVectorFields}
            </EuiText>
            <EuiTextColor color="subdued">
              {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.aiSearch.semanticFields', {
                defaultMessage: '{denseVectorFields, plural, one {Field} other {Fields}}',
                values: {
                  denseVectorFields,
                },
              })}
            </EuiTextColor>
          </EuiFlexGroup>
        ),
        right: (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiIconTip
              aria-label={i18n.translate(
                'xpack.idxMgmt.indexDetails.overviewTab.aiSearch.sparseVector.iconLabel',
                {
                  defaultMessage: 'Sparse vector fields',
                }
              )}
              size="l"
              type="tokenVectorSparse"
              color="subdued"
              content={i18n.translate(
                'xpack.idxMgmt.indexDetails.overviewTab.aiSearch.sparseVector.iconLabel',
                {
                  defaultMessage: 'Sparse vector fields',
                }
              )}
            />
            <EuiText
              css={css`
                font-size: ${largeFontSize};
              `}
            >
              {sparseVectorFields}
            </EuiText>
            <EuiTextColor color="subdued">
              {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.aiSearch.semanticFields', {
                defaultMessage: '{sparseVectorFields, plural, one {Field} other {Fields}}',
                values: {
                  sparseVectorFields,
                },
              })}
            </EuiTextColor>
          </EuiFlexGroup>
        ),
      }}
      footer={{
        left: (
          <EuiTextColor color="subdued">
            {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.aiSearch.totalFieldsLabel', {
              defaultMessage:
                '{vectorFieldCount, plural, one {# Total field} other {# Total fields}} ',
              values: {
                vectorFieldCount,
              },
            })}
          </EuiTextColor>
        ),
      }}
    />
  );
};
