/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBadge,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { PERMANENTLY_TRUNCATED_FIELDS } from './constants';

interface ResultFieldValueProps {
  fieldValue: string;
  fieldType: string;
  isExpanded?: boolean;
  embeddings: string | undefined;
}

function truncateVectors(embeddings: string[] | string[][]): string {
  const embeds = Array.isArray(embeddings[0])
    ? truncateVectors(embeddings[0])
    : embeddings.length > 4
    ? embeddings.slice(0, 5).concat(['...']).join(', ')
    : embeddings.join(', ');
  return `[${embeds}]`;
}

function getEmbeddings(embeddings: string): { embeddings: string[] | string[][]; chunks: number } {
  try {
    const embeds = JSON.parse(embeddings);
    if (Array.isArray(embeds)) {
      if (Array.isArray(embeds[0])) {
        return { embeddings: embeds, chunks: embeds.length };
      }
      return { embeddings: embeds, chunks: 1 };
    }
    return { embeddings: [], chunks: 0 };
  } catch {
    return { embeddings: [], chunks: 0 };
  }
}

export const VectorFieldValue: React.FC<{ embeddings: string }> = ({ embeddings }) => {
  const { embeddings: jsonEmbeddings, chunks } = getEmbeddings(embeddings);
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiBadge>
          {i18n.translate('xpack.searchIndexDocuments.result.value.denseVector.dimLabel', {
            defaultMessage: '{value} dims',
            values: {
              value: jsonEmbeddings.length,
            },
          })}
        </EuiBadge>
      </EuiFlexItem>
      {chunks > 1 && (
        <EuiFlexItem grow={false}>
          <EuiBadge>
            {i18n.translate('xpack.searchIndexDocuments.result.value.denseVector.chunksLabel', {
              defaultMessage: '{value} chunks',
              values: {
                value: chunks,
              },
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiCodeBlock transparentBackground fontSize="s" paddingSize="none">
          {truncateVectors(jsonEmbeddings)}
        </EuiCodeBlock>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={embeddings}>
          {(copy) => (
            <EuiIcon
              type="copy"
              onClick={copy}
              data-test-subj="copyDenseVector"
              aria-label={i18n.translate(
                'xpack.searchIndexDocuments.result.value.denseVector.copy',
                {
                  defaultMessage: 'Copy vector',
                }
              )}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ResultFieldValue: React.FC<ResultFieldValueProps> = ({
  fieldValue,
  fieldType,
  isExpanded = false,
  embeddings,
}) => {
  if (
    isExpanded &&
    fieldType &&
    (['object', 'array', 'nested'].includes(fieldType) || Array.isArray(fieldValue))
  ) {
    return (
      <EuiCodeBlock language="json" transparentBackground fontSize="s">
        {fieldValue}
      </EuiCodeBlock>
    );
  } else if (PERMANENTLY_TRUNCATED_FIELDS.includes(fieldType)) {
    return (
      <>
        {fieldType === 'dense_vector' ? (
          <VectorFieldValue embeddings={fieldValue} />
        ) : (
          <EuiText size="s" color="default">
            {fieldValue}
          </EuiText>
        )}
      </>
    );
  } else if (embeddings && embeddings.length > 0) {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        justifyContent="spaceBetween"
        css={{ flex: 1 }}
      >
        <EuiFlexItem>
          <EuiText size="s" color="default">
            {fieldValue}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <VectorFieldValue embeddings={embeddings} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  {
    return (
      <EuiText size="s" color="default">
        {fieldValue}
      </EuiText>
    );
  }
};
