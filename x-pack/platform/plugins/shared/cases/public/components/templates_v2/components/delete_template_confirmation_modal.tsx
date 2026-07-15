/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useGetTemplatesUsage } from '../hooks/use_get_templates_usage';
import { useBulkExportTemplates } from '../hooks/use_bulk_export_templates';
import * as i18n from '../translations';

interface DeleteTemplateConfirmationModalProps {
  title: string;
  templateIds: string[];
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

const DeleteTemplateConfirmationModalComponent: React.FC<DeleteTemplateConfirmationModalProps> = ({
  title,
  templateIds,
  onCancel,
  onConfirm,
  isDeleting = false,
}) => {
  const titleId = useGeneratedHtmlId();
  const { data: usage, isLoading: isLoadingUsage } = useGetTemplatesUsage(templateIds, true);
  const { mutate: exportTemplates, isLoading: isExporting } = useBulkExportTemplates();

  const handleDownload = useCallback(
    () => exportTemplates({ templateIds }),
    [exportTemplates, templateIds]
  );

  const total = usage?.total ?? 0;
  // The listed cases are capped server-side; surface the remainder as a count so the warning is honest.
  const overflow = total - (usage?.cases.length ?? 0);

  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.CANCEL}
      confirmButtonText={i18n.DELETE}
      data-test-subj="delete-template-confirmation-modal"
      defaultFocusedButton="cancel"
      isLoading={isDeleting}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      titleProps={{ id: titleId }}
      aria-labelledby={titleId}
    >
      <EuiCallOut
        size="s"
        color="warning"
        iconType="warning"
        title={i18n.DELETE_TEMPLATE_UNLINK_WARNING}
        data-test-subj="delete-template-unlink-warning"
      />
      <EuiSpacer size="m" />

      {isLoadingUsage ? (
        <EuiText size="s" data-test-subj="delete-template-usage-loading">
          <EuiLoadingSpinner size="s" /> {i18n.CHECKING_AFFECTED_CASES}
        </EuiText>
      ) : total === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="delete-template-no-affected-cases">
          {i18n.NO_AFFECTED_CASES}
        </EuiText>
      ) : (
        <div data-test-subj="delete-template-affected-cases">
          <EuiText size="s">
            <strong>{i18n.AFFECTED_CASES_TITLE(total)}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <ul>
              {(usage?.cases ?? []).map((c) => (
                <li key={c.id}>{c.title}</li>
              ))}
            </ul>
            {overflow > 0 && (
              <p>
                <em>{i18n.AND_N_MORE_CASES(overflow)}</em>
              </p>
            )}
          </EuiText>
        </div>
      )}

      <EuiSpacer size="m" />
      <EuiButtonEmpty
        iconType="download"
        flush="left"
        size="s"
        onClick={handleDownload}
        isLoading={isExporting}
        data-test-subj="delete-template-download-first"
      >
        {i18n.DOWNLOAD_BEFORE_DELETE(templateIds.length)}
      </EuiButtonEmpty>
    </EuiConfirmModal>
  );
};

DeleteTemplateConfirmationModalComponent.displayName = 'DeleteTemplateConfirmationModal';

export const DeleteTemplateConfirmationModal = React.memo(DeleteTemplateConfirmationModalComponent);
