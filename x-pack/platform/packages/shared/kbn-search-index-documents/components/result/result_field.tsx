/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { IconType } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiToken,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { ResultFieldProps } from './result_types';
import { PERMANENTLY_TRUNCATED_FIELDS } from './constants';
import { ResultFieldValue, VectorFieldValue } from './result_field_value';
import * as Styles from './styles';

const iconMap: Record<string, string> = {
  boolean: 'tokenBoolean',
  date: 'tokenDate',
  date_range: 'tokenDate',
  dense_vector: 'tokenVectorDense',
  double: 'tokenNumber',
  double_range: 'tokenDate',
  flattened: 'tokenObject',
  float: 'tokenNumber',
  float_range: 'tokenNumber',
  geo_point: 'tokenGeo',
  geo_shape: 'tokenGeo',
  half_float: 'tokenNumber',
  histogram: 'tokenHistogram',
  integer: 'tokenNumber',
  integer_range: 'tokenNumber',
  ip: 'tokenIp',
  ip_range: 'tokenIp',
  join: 'tokenJoin',
  keyword: 'tokenKeyword',
  long: 'tokenNumber',
  long_range: 'tokenNumber',
  nested: 'tokenObject',
  object: 'tokenObject',
  percolator: 'tokenPercolator',
  rank_feature: 'tokenRankFeature',
  rank_features: 'tokenRankFeatures',
  scaled_float: 'tokenNumber',
  search_as_you_type: 'tokenSearchType',
  semantic_text: 'tokenSemanticText',
  shape: 'tokenShape',
  short: 'tokenNumber',
  sparse_vector: 'tokenVectorSparse',
  text: 'tokenString',
  token_count: 'tokenTokenCount',
  unsigned_long: 'tokenNumber',
};
const defaultToken = 'question';

const TypeLine: React.FC<{ iconType: IconType; label: string; fieldTypeLabel?: string }> = ({
  iconType,
  label,
  fieldTypeLabel,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const iconButton = (
    <EuiButtonEmpty
      size="s"
      aria-label={
        fieldTypeLabel ??
        i18n.translate('xpack.searchIndexDocuments.result.fieldTypeButtonAriaLabel', {
          defaultMessage: "Show this field's type",
        })
      }
      onClick={fieldTypeLabel ? () => setIsPopoverOpen(!isPopoverOpen) : undefined}
    >
      <EuiToken iconType={iconType} size="s" />
    </EuiButtonEmpty>
  );
  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs" justifyContent="center">
      <EuiFlexItem grow={false}>
        {fieldTypeLabel ? (
          <EuiPopover
            aria-label={fieldTypeLabel}
            closePopover={() => setIsPopoverOpen(false)}
            button={iconButton}
            isOpen={isPopoverOpen}
          >
            {fieldTypeLabel}
          </EuiPopover>
        ) : (
          iconButton
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="default">
          {label}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ResultField: React.FC<ResultFieldProps> = ({
  iconType,
  fieldName,
  fieldValue,
  fieldType = 'object',
  embeddings,
  dimensions,
  isExpanded,
}) => {
  const { euiTheme } = useEuiTheme();
  const isSemanticVector = fieldType === 'semantic_text' && embeddings && embeddings.length > 0;
  const shouldTruncate = !isExpanded || PERMANENTLY_TRUNCATED_FIELDS.includes(fieldType);
  const resolvedIconType = iconType || (fieldType ? iconMap[fieldType] : defaultToken);

  const fieldTypeLabel = i18n.translate('xpack.searchIndexDocuments.result.fieldTypeAriaLabel', {
    defaultMessage: 'This field is of the type {fieldType}',
    values: { fieldType },
  });

  if (isSemanticVector && isExpanded) {
    return (
      <EuiTableRow css={Styles.resultFieldSemanticVector(euiTheme)}>
        <EuiTableRowCell colSpan={2} className="resultFieldRowCell" truncateText={false}>
          <Styles.SemanticVectorGrid $padding={euiTheme.size.s}>
            <TypeLine
              iconType="tokenSemanticText"
              label={fieldName}
              fieldTypeLabel={fieldTypeLabel}
            />
            <EuiText size="s" color="default">
              {fieldValue}
            </EuiText>
            <TypeLine
              iconType="tokenVectorDense"
              label={i18n.translate(
                'xpack.searchIndexDocuments.result.value.semanticText.embeddingsLabel',
                { defaultMessage: 'embeddings' }
              )}
              fieldTypeLabel={i18n.translate(
                'xpack.searchIndexDocuments.result.embeddingsFieldTypeAriaLabel',
                {
                  defaultMessage:
                    'This semantic text field contains embeddings as well as the original text',
                }
              )}
            />
            <VectorFieldValue embeddings={embeddings} dimensions={dimensions} />
          </Styles.SemanticVectorGrid>
        </EuiTableRowCell>
      </EuiTableRow>
    );
  }

  return (
    <EuiTableRow css={Styles.resultField(euiTheme)}>
      <EuiTableRowCell className="resultFieldRowCell" valign="middle" truncateText={!isExpanded}>
        <TypeLine iconType={resolvedIconType} label={fieldName} fieldTypeLabel={fieldTypeLabel} />
      </EuiTableRowCell>
      <EuiTableRowCell className="resultFieldRowCell" truncateText={shouldTruncate} valign="middle">
        <ResultFieldValue
          fieldValue={fieldValue}
          fieldType={fieldType}
          embeddings={isExpanded ? embeddings : undefined}
          dimensions={dimensions}
          isExpanded={isExpanded}
        />
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
