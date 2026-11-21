/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  copyToClipboard,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQuery } from '@kbn/react-query';
import type { ReportResponse } from '../../../../common/investigations/types';
import { getReport } from '../../api/client';
import { investigationKeys } from '../../api/query_keys';
import { useInvestigationToasts } from '../../hooks';
import { ICONS } from '../../icons';
import { useInvestigationsServices } from '../../services';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

type ReportView = 'preview' | 'raw';

const REPORT_BODY_MAX_HEIGHT = 420;

const VIEW_OPTIONS = [
  {
    id: 'preview',
    label: i18n.REPORT_VIEW_PREVIEW,
    'data-test-subj': 'investigationReportViewPreview',
  },
  { id: 'raw', label: i18n.REPORT_VIEW_RAW, 'data-test-subj': 'investigationReportViewRaw' },
];

const downloadMarkdown = ({ markdown, filename }: ReportResponse): void => {
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const writeToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyToClipboard(text);
  }
};

/** The generated investigation report as a formatted preview or raw Markdown, to copy or save. */
export const ReportModal: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId();
  const { http } = useInvestigationsServices();
  const { showError, showSuccess } = useInvestigationToasts();
  const [view, setView] = useState<ReportView>('preview');

  const report = useQuery(
    [...investigationKeys.recordScope(record.id), 'report'],
    () => getReport(http, record.id),
    { retry: false, refetchOnMount: 'always' }
  );
  const data = report.isError ? undefined : report.data;

  const onCopy = async () => {
    if (!data) {
      return;
    }
    if (await writeToClipboard(data.markdown)) {
      showSuccess(i18n.REPORT_COPIED);
    } else {
      showError(new Error(i18n.REPORT_COPY_ERROR), i18n.REPORT_COPY_ERROR);
    }
  };

  const onDownload = () => {
    if (!data) {
      return;
    }
    downloadMarkdown(data);
    showSuccess(i18n.REPORT_DOWNLOADED(data.filename));
  };

  const body = (() => {
    if (report.isLoading) {
      return <LoadingState label={i18n.REPORT_LOADING} />;
    }
    if (report.isError || !data) {
      return (
        <ErrorState
          title={i18n.REPORT_ERROR}
          error={report.error}
          onRetry={() => report.refetch()}
        />
      );
    }
    return (
      <>
        <EuiButtonGroup
          legend={i18n.REPORT_VIEW_LEGEND}
          options={VIEW_OPTIONS}
          idSelected={view}
          onChange={(id) => setView(id === 'raw' ? 'raw' : 'preview')}
          buttonSize="compressed"
          data-test-subj="investigationReportView"
        />
        <EuiSpacer size="s" />
        {view === 'preview' ? (
          <EuiPanel
            hasShadow={false}
            hasBorder
            paddingSize="m"
            tabIndex={0}
            aria-label={i18n.REPORT_VIEW_PREVIEW}
            css={css`
              max-height: ${REPORT_BODY_MAX_HEIGHT}px;
              overflow: auto;
            `}
            data-test-subj="investigationReportPreview"
          >
            <EuiMarkdownFormat textSize="s">{data.markdown}</EuiMarkdownFormat>
          </EuiPanel>
        ) : (
          <EuiCodeBlock
            language="markdown"
            fontSize="s"
            paddingSize="m"
            overflowHeight={REPORT_BODY_MAX_HEIGHT}
            whiteSpace="pre"
            data-test-subj="investigationReportRaw"
          >
            {data.markdown}
          </EuiCodeBlock>
        )}
      </>
    );
  })();

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(${euiTheme.breakpoint.m}px, 100%);
      `}
      data-test-subj="investigationReportModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.REPORT_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.REPORT_INTRO}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {body}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{i18n.CLOSE_BUTTON}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType={ICONS.download}
              onClick={onDownload}
              isDisabled={!data}
              data-test-subj="investigationReportDownload"
            >
              {i18n.REPORT_DOWNLOAD}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType={ICONS.copy}
              onClick={onCopy}
              isDisabled={!data}
              data-test-subj="investigationReportCopy"
            >
              {i18n.REPORT_COPY}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
ReportModal.displayName = 'ReportModal';
