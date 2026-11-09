/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import useDebounce from 'react-use/lib/useDebounce';
import { CASE_FIND_URL } from '../../../../../common/constants';
import type { CasesFindResponse } from '../../../../../common/types/api';
import type { CaseUI } from '../../../../../common/ui/types';
import { KibanaServices } from '../../../../common/lib/kibana';
import * as i18n from './translations';

const PAGE_SIZE = 20;

interface LinkCasesModalProps {
  caseData: Pick<CaseUI, 'id' | 'owner'>;
  /** Cases already linked; they aren't offered again. */
  excludeIds: string[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (caseIds: string[]) => void;
}

interface CaseOptionFields {
  caseNumber: string;
  caseStatus: string;
  restricted: boolean;
}
type CaseOption = EuiSelectableOption<CaseOptionFields>;

/**
 * Picks cases to link. It reads through the Cases find API as the viewer, which already leaves out
 * restricted cases they aren't assigned to, so the picker can't reveal one.
 */
export const LinkCasesModal: React.FC<LinkCasesModalProps> = ({
  caseData,
  excludeIds,
  isSubmitting,
  onCancel,
  onSubmit,
}) => {
  const titleId = useGeneratedHtmlId();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  useDebounce(() => setDebounced(search), 300, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cases', 'linkPicker', caseData.owner, debounced],
    queryFn: ({ signal }) =>
      KibanaServices.get().http.get<CasesFindResponse>(CASE_FIND_URL, {
        query: {
          owner: caseData.owner,
          perPage: PAGE_SIZE,
          sortField: 'updatedAt',
          sortOrder: 'desc',
          ...(debounced ? { search: debounced, searchFields: ['title'] } : {}),
        },
        signal,
      }),
  });

  const options: CaseOption[] = useMemo(
    () =>
      (data?.cases ?? [])
        .filter(({ id }) => id !== caseData.id && !excludeIds.includes(id))
        .map(
          (c): CaseOption => ({
            key: c.id,
            label: c.title,
            checked: selected.includes(c.id) ? ('on' as const) : undefined,
            caseNumber: c.incremental_id != null ? i18n.CASE_NUMBER(c.incremental_id) : '',
            caseStatus: String(c.status),
            restricted: c.access?.mode === 'restricted',
            'data-test-subj': `link-case-option-${c.id}`,
          })
        ),
    [data, caseData.id, excludeIds, selected]
  );

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={titleId}
      style={{ width: 640 }}
      data-test-subj="link-cases-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.PICKER_TITLE_CASES}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.PICKER_HELP_CASES}</p>
          <p>{i18n.RESTRICTED_NOTE}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFieldSearch
          fullWidth
          placeholder={i18n.PICKER_SEARCH_CASES}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          isLoading={isLoading}
          data-test-subj="link-cases-search"
        />
        <EuiSpacer size="s" />
        {isError ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={i18n.PICKER_LOAD_ERROR}
            size="s"
          >
            <EuiButtonEmpty size="xs" onClick={() => refetch()}>
              {i18n.RETRY}
            </EuiButtonEmpty>
          </EuiCallOut>
        ) : (
          <EuiSelectable<CaseOptionFields>
            aria-label={i18n.PICKER_TITLE_CASES}
            options={options}
            isLoading={isLoading}
            listProps={{ rowHeight: 48, showIcons: true }}
            emptyMessage={i18n.PICKER_NO_MATCHES}
            onChange={(next) =>
              setSelected(next.filter((o) => o.checked === 'on').map((o) => String(o.key)))
            }
            renderOption={(option) => (
              <div>
                <div className="eui-textTruncate">{option.label}</div>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  {option.restricted ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="default" iconType="lock">
                        {i18n.RESTRICTED_BADGE}
                      </EuiBadge>
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {[option.caseNumber, option.caseStatus].filter(Boolean).join(' · ')}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            )}
            data-test-subj="link-cases-selectable"
          >
            {(list) => list}
          </EuiSelectable>
        )}
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued" data-test-subj="link-cases-selected-count">
          {i18n.PICKER_SELECTED(selected.length)}
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="link-cases-cancel">
          {i18n.PICKER_CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isDisabled={selected.length === 0}
          isLoading={isSubmitting}
          onClick={() => onSubmit(selected)}
          data-test-subj="link-cases-submit"
        >
          {i18n.PICKER_SUBMIT}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
LinkCasesModal.displayName = 'LinkCasesModal';
