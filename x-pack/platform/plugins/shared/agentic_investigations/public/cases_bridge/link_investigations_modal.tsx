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
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  type EuiSelectableOption,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CaseUI } from '@kbn/cases-plugin/common';
import { linkCase, listOpenInvestigations } from './api';
import { LINK_PICKER, RELATED, OPEN_CASE } from './translations';

/**
 * Picks open investigations to link to a case. Only investigations without a case are offered:
 * an investigation records one case.
 */
export const LinkInvestigationsModal: React.FC<{
  caseData: CaseUI;
  linkedIds: string[];
  onClose: () => void;
  onLinked: () => void;
}> = ({ caseData, linkedIds, onClose, onLinked }) => {
  const { services } = useKibana<CoreStart>();
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'openInvestigations'],
    queryFn: ({ signal }) => listOpenInvestigations(services.http, { signal }),
  });

  const options: EuiSelectableOption[] = useMemo(
    () =>
      (data?.results ?? [])
        .filter(
          (investigation) =>
            !linkedIds.includes(investigation.id) && investigation.metadata.case_id == null
        )
        .map((investigation) => ({
          key: investigation.id,
          label: investigation.title || RELATED.untitled,
          data: {
            subtitle: [investigation.metadata.severity, investigation.metadata.summary]
              .filter(Boolean)
              .join(' · '),
          },
          checked: selected.includes(investigation.id) ? 'on' : undefined,
          'data-test-subj': `cases-bridge-link-option-${investigation.id}`,
        })),
    [data, linkedIds, selected]
  );

  const onSubmit = async () => {
    setIsSubmitting(true);
    const titles = new Map(options.map(({ key, label }) => [key, label]));
    const results = await Promise.allSettled(
      selected.map((id) => linkCase(services.http, id, caseData.id))
    );
    setIsSubmitting(false);
    const linked = results.filter(({ status }) => status === 'fulfilled').length;
    if (linked > 0) {
      services.notifications.toasts.addSuccess({
        title: RELATED.linkedToastTitle,
        text: RELATED.linkedToastText(
          selected.length === 1 ? titles.get(selected[0]) ?? '' : String(linked)
        ),
      });
    }
    const failed = results.length - linked;
    if (failed > 0) {
      services.notifications.toasts.addWarning({
        title: RELATED.linkFailedToast,
        text: OPEN_CASE.partialToastText(failed),
      });
    }
    onLinked();
  };

  return (
    <EuiModal onClose={onClose} style={{ width: 640 }} data-test-subj="cases-bridge-link-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{LINK_PICKER.title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          {LINK_PICKER.help}
        </EuiText>
        <EuiSpacer size="m" />
        {isError ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            size="s"
            iconType="error"
            title={OPEN_CASE.investigationsError}
          >
            <EuiButton size="s" color="danger" onClick={() => refetch()}>
              {OPEN_CASE.tryAgain}
            </EuiButton>
          </EuiCallOut>
        ) : (
          <EuiSelectable
            searchable
            searchProps={{
              placeholder: LINK_PICKER.search,
              'data-test-subj': 'cases-bridge-link-search',
            }}
            options={options}
            isLoading={isLoading}
            emptyMessage={LINK_PICKER.empty}
            listProps={{ rowHeight: 48, showIcons: true }}
            renderOption={(option) => (
              <>
                <EuiText size="s" className="eui-textTruncate">
                  {option.label}
                </EuiText>
                <EuiText size="xs" color="subdued" className="eui-textTruncate">
                  {(option as { subtitle?: string }).subtitle ?? option.data?.subtitle}
                </EuiText>
              </>
            )}
            onChange={(next) =>
              setSelected(
                next.flatMap(({ checked, key }) => (checked === 'on' && key ? [key] : []))
              )
            }
            height={300}
          >
            {(list, search) => (
              <>
                {search}
                <EuiSpacer size="s" />
                {list}
              </>
            )}
          </EuiSelectable>
        )}
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {OPEN_CASE.selectedCount(selected.length)}
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="cases-bridge-link-cancel">
          {LINK_PICKER.cancel}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isDisabled={selected.length === 0}
          isLoading={isSubmitting}
          onClick={onSubmit}
          data-test-subj="cases-bridge-link-submit"
        >
          {LINK_PICKER.submit}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
