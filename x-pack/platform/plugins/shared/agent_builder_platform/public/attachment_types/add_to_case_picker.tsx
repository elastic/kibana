/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiSelectable,
  EuiLoadingSpinner,
  EuiText,
  EuiFieldSearch,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';

const CASES_FIND_URL = '/api/cases/_find';
const CASES_INTERNAL_BULK_CREATE_ATTACHMENTS_URL =
  '/internal/cases/{case_id}/attachments/_bulk_create';

interface CaseSummary {
  id: string;
  title: string;
  status: string;
}

interface AddToCasePickerProps {
  http: HttpStart;
  notifications?: NotificationsStart;
  mermaidContent: string;
  mermaidTitle?: string;
  attachmentType: string;
  onClose: () => void;
}

export const AddToCasePicker: React.FC<AddToCasePickerProps> = ({
  http,
  notifications,
  mermaidContent,
  mermaidTitle,
  attachmentType,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const fetchCases = useCallback(
    async (search?: string) => {
      setLoading(true);
      setError(null);
      try {
        const query: Record<string, string | number> = {
          page: 1,
          perPage: 20,
          sortField: 'updatedAt',
          sortOrder: 'desc',
          status: 'open',
        };

        if (search) {
          query.search = search;
        }

        const response = await http.get<{ cases: CaseSummary[] }>(CASES_FIND_URL, { query });
        setCases(response.cases);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.fetchCasesError', {
                defaultMessage: 'Failed to fetch cases',
              });
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [http]
  );

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      fetchCases(value);
    },
    [fetchCases]
  );

  const handleSelectionChange = useCallback((options: EuiSelectableOption[]) => {
    const selected = options.find((opt) => opt.checked === 'on');
    setSelectedCaseId(selected?.key ?? null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedCaseId) {
      return;
    }

    setSubmitting(true);
    try {
      const url = CASES_INTERNAL_BULK_CREATE_ATTACHMENTS_URL.replace(
        '{case_id}',
        encodeURIComponent(selectedCaseId)
      );
      await http.post(url, {
        body: JSON.stringify([
          {
            type: attachmentType,
            data: {
              content: mermaidContent,
              ...(mermaidTitle ? { title: mermaidTitle } : {}),
            },
          },
        ]),
      });

      notifications?.toasts.addSuccess(
        i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.addToCaseSuccess', {
          defaultMessage: 'Mermaid diagram added to case',
        })
      );
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.addToCaseError', {
              defaultMessage: 'Failed to add diagram to case',
            });
      notifications?.toasts.addDanger(message);
    } finally {
      setSubmitting(false);
    }
  }, [selectedCaseId, http, attachmentType, mermaidContent, mermaidTitle, notifications, onClose]);

  const selectableOptions: EuiSelectableOption[] = cases.map((c) => ({
    key: c.id,
    label: c.title,
    checked: c.id === selectedCaseId ? 'on' : undefined,
  }));

  return (
    <EuiModal onClose={onClose} style={{ maxWidth: 500 }} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.addToCaseTitle', {
            defaultMessage: 'Add diagram to case',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFieldSearch
          placeholder={i18n.translate(
            'xpack.agentBuilderPlatform.attachments.mermaid.searchCasesPlaceholder',
            { defaultMessage: 'Search cases…' }
          )}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          isClearable
          fullWidth
        />
        <EuiSpacer size="s" />
        {loading ? (
          <EuiLoadingSpinner size="l" />
        ) : error ? (
          <EuiText color="danger" size="s">
            {error}
          </EuiText>
        ) : cases.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.noCasesFound', {
              defaultMessage: 'No open cases found',
            })}
          </EuiText>
        ) : (
          <EuiSelectable
            options={selectableOptions}
            singleSelection
            onChange={handleSelectionChange}
            listProps={{ bordered: true }}
          >
            {(list) => list}
          </EuiSelectable>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleSubmit}
          isLoading={submitting}
          isDisabled={!selectedCaseId || loading}
        >
          {i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.addToCase', {
            defaultMessage: 'Add to case',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
