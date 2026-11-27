/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCheckbox,
  EuiCodeBlock,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ExportItemsRequest, FindItemsRequest } from '../../../../common/investigations/types';
import { useInvestigationToasts, useItems } from '../../hooks';
import { getHttpErrorMessage } from '../../hooks/errors';
import { ICONS } from '../../icons';
import type { EvidenceFilterRequest } from './evidence_state';
import { useEvidenceExport } from './use_evidence_queries';
import * as i18n from './translations';

const PREVIEW_LINES = 12;

type ExportFormat = ExportItemsRequest['format'];

const FORMAT_OPTIONS: Array<{ id: ExportFormat; label: string }> = [
  { id: 'csv', label: i18n.FORMAT_CSV },
  { id: 'json', label: i18n.FORMAT_JSON },
  { id: 'stix', label: i18n.FORMAT_STIX },
  { id: 'list', label: i18n.FORMAT_LIST },
];

export interface ExportModalProps {
  recordId: string;
  filter: EvidenceFilterRequest;
  /** Export only these items (the grid selection) instead of everything the grid matches. */
  ids?: string[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ recordId, filter, ids, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'investigationEvidenceExportTitle' });
  const { showSuccess } = useInvestigationToasts();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [indicatorsOnly, setIndicatorsOnly] = useState(false);

  const indicatorsUnavailable = Boolean(filter.type && !filter.type.includes('indicator'));
  const matching = useMemo<Omit<FindItemsRequest, 'page' | 'per_page' | 'cursor' | 'facets'>>(
    () => ({
      ...filter,
      ...(ids ? { ids } : {}),
      ...(indicatorsOnly && !indicatorsUnavailable ? { type: ['indicator'] } : {}),
    }),
    [filter, ids, indicatorsOnly, indicatorsUnavailable]
  );
  const request = useMemo<ExportItemsRequest>(() => ({ ...matching, format }), [matching, format]);

  const { data: countData } = useItems(recordId, { ...matching, per_page: 1 });
  const {
    data: exported,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useEvidenceExport(recordId, request);
  const total = countData?.total;

  const preview = useMemo(() => {
    if (!exported) return '';
    const lines = exported.text.split('\n');
    const shown = lines.slice(0, PREVIEW_LINES).join('\n');
    return lines.length > PREVIEW_LINES
      ? `${shown}\n${i18n.EXPORT_MORE_LINES(lines.length - PREVIEW_LINES)}`
      : shown;
  }, [exported]);

  const download = () => {
    if (!exported) return;
    const url = URL.createObjectURL(new Blob([exported.text], { type: exported.contentType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exported.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const copy = () => {
    if (!exported) return;
    navigator.clipboard
      .writeText(exported.text)
      .then(() => showSuccess(i18n.COPIED(total ?? 0)))
      .catch(() => undefined);
  };

  const isEmpty = total === 0;

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="investigationEvidenceExportModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.EXPORT_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          {ids ? i18n.EXPORT_SELECTED_INTRO(ids.length) : i18n.EXPORT_INTRO(total ?? 0)}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCheckbox
          id="investigationEvidenceExportIndicators"
          label={i18n.INDICATORS_ONLY}
          checked={indicatorsOnly && !indicatorsUnavailable}
          disabled={indicatorsUnavailable}
          onChange={(event) => setIndicatorsOnly(event.target.checked)}
          data-test-subj="investigationEvidenceExportIndicators"
        />
        <EuiSpacer size="m" />
        <EuiFormRow label={i18n.FORMAT} display="rowCompressed">
          <EuiButtonGroup
            legend={i18n.FORMAT}
            buttonSize="compressed"
            options={FORMAT_OPTIONS.map(({ id, label }) => ({
              id: `investigationEvidenceExportFormat-${id}`,
              label,
              'data-test-subj': `investigationEvidenceExportFormat-${id}`,
            }))}
            idSelected={`investigationEvidenceExportFormat-${format}`}
            onChange={(id) => {
              const next = FORMAT_OPTIONS.find(
                (option) => `investigationEvidenceExportFormat-${option.id}` === id
              );
              if (next) setFormat(next.id);
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={i18n.EXPORT_PREVIEW(total ?? 0)} fullWidth>
          {error ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType={ICONS.error}
              size="s"
              title={i18n.EXPORT_ERROR}
              text={<p>{getHttpErrorMessage(error)}</p>}
              actionProps={{ primary: { children: i18n.RETRY, onClick: () => void refetch() } }}
              data-test-subj="investigationEvidenceExportError"
            />
          ) : isLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : (
            <EuiCodeBlock
              isCopyable={false}
              overflowHeight={240}
              fontSize="s"
              paddingSize="m"
              whiteSpace="pre"
              data-test-subj="investigationEvidenceExportPreview"
            >
              {isEmpty ? i18n.EXPORT_EMPTY : preview}
            </EuiCodeBlock>
          )}
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationEvidenceExportClose">
          {i18n.CLOSE}
        </EuiButtonEmpty>
        <EuiButton
          iconType={ICONS.copy}
          isDisabled={!exported || isEmpty || isFetching}
          onClick={copy}
          data-test-subj="investigationEvidenceExportCopy"
        >
          {i18n.COPY_ROWS(total ?? 0)}
        </EuiButton>
        <EuiButton
          fill
          iconType={ICONS.download}
          isDisabled={!exported || isEmpty || isFetching}
          onClick={download}
          data-test-subj="investigationEvidenceExportDownload"
        >
          {i18n.DOWNLOAD}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
ExportModal.displayName = 'ExportModal';
