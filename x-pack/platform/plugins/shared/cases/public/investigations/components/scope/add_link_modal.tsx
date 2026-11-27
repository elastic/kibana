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
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { LINK_KIND_LABELS } from '../../../../common/investigations/types';
import type {
  EntityItem,
  LinkItem,
  LinkKind,
  LinkStatus,
} from '../../../../common/investigations/types';
import { useBulkCreateItems, useInvestigationToasts } from '../../hooks';
import { LINK_STATUS_LABELS } from './scope_helpers';
import * as i18n from './translations';

const MAX_LABEL_LENGTH = 512;
const LINK_KINDS: readonly LinkKind[] = [
  'execution',
  'ownership',
  'authentication',
  'network',
  'lateral_movement',
];
const CREATE_STATUSES: readonly LinkStatus[] = ['confirmed', 'suspected'];

export interface AddLinkModalProps {
  recordId: string;
  entities: readonly EntityItem[];
  initialFromId?: string;
  onClose: () => void;
  onCreated: (link: LinkItem) => void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({
  recordId,
  entities,
  initialFromId,
  onClose,
  onCreated,
}) => {
  const titleId = useGeneratedHtmlId();
  const { showSuccess } = useInvestigationToasts();
  const { mutate, isLoading } = useBulkCreateItems(recordId);
  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      entities.map((entity) => ({ key: entity.id, label: entity.entity.name, value: entity.id })),
    [entities]
  );
  const initialFrom = options.filter((option) => option.value === initialFromId);
  const [from, setFrom] = useState<Array<EuiComboBoxOptionOption<string>>>(initialFrom);
  const [to, setTo] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [kind, setKind] = useState<LinkKind>('network');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<LinkStatus>('confirmed');
  const [submitted, setSubmitted] = useState(false);

  const fromId = from[0]?.value;
  const toId = to[0]?.value;
  const trimmedLabel = label.trim();
  const fromError = fromId ? null : i18n.FROM_REQUIRED;
  const toError = !toId ? i18n.TO_REQUIRED : toId === fromId ? i18n.SAME_ENTITY : null;
  const labelError =
    trimmedLabel.length === 0
      ? i18n.LABEL_REQUIRED
      : trimmedLabel.length > MAX_LABEL_LENGTH
      ? i18n.LABEL_TOO_LONG
      : null;

  const submit = () => {
    setSubmitted(true);
    if (fromError || toError || labelError || !fromId || !toId) {
      return;
    }
    mutate(
      {
        items: [
          {
            kind: 'link',
            title: trimmedLabel,
            status,
            link: {
              from_id: fromId,
              to_id: toId,
              kind,
              label: trimmedLabel,
              evidence_ids: [],
              description: null,
              claim_id: null,
            },
          },
        ],
      },
      {
        onSuccess: ({ items }) => {
          showSuccess(i18n.ADD_LINK_SUCCESS);
          const created = items.find((item): item is LinkItem => item.kind === 'link');
          if (created) {
            onCreated(created);
          }
          onClose();
        },
      }
    );
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="investigationAddLinkModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.ADD_LINK_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <EuiFormRow
            label={i18n.ADD_LINK_FROM}
            isInvalid={submitted && fromError !== null}
            error={fromError ?? undefined}
            fullWidth
          >
            <EuiComboBox
              fullWidth
              singleSelection={{ asPlainText: true }}
              placeholder={i18n.CHOOSE_ENTITY}
              aria-label={i18n.ADD_LINK_FROM}
              options={options}
              selectedOptions={from}
              onChange={setFrom}
              isInvalid={submitted && fromError !== null}
              data-test-subj="investigationAddLinkFrom"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.ADD_LINK_TO}
            isInvalid={submitted && toError !== null}
            error={toError ?? undefined}
            fullWidth
          >
            <EuiComboBox
              fullWidth
              singleSelection={{ asPlainText: true }}
              placeholder={i18n.CHOOSE_ENTITY}
              aria-label={i18n.ADD_LINK_TO}
              options={options}
              selectedOptions={to}
              onChange={setTo}
              isInvalid={submitted && toError !== null}
              data-test-subj="investigationAddLinkTo"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.ADD_LINK_KIND} fullWidth>
            <EuiSelect
              fullWidth
              value={kind}
              options={LINK_KINDS.map((value) => ({ value, text: LINK_KIND_LABELS[value] }))}
              onChange={(event) =>
                setKind(LINK_KINDS.find((value) => value === event.target.value) ?? 'network')
              }
              data-test-subj="investigationAddLinkKind"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.ADD_LINK_LABEL}
            isInvalid={submitted && labelError !== null}
            error={labelError ?? undefined}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={label}
              isInvalid={submitted && labelError !== null}
              maxLength={MAX_LABEL_LENGTH + 1}
              placeholder={i18n.ADD_LINK_LABEL_PLACEHOLDER}
              onChange={(event) => setLabel(event.target.value)}
              data-test-subj="investigationAddLinkLabel"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.ADD_LINK_STATUS} fullWidth>
            <EuiSelect
              fullWidth
              value={status}
              options={CREATE_STATUSES.map((value) => ({ value, text: LINK_STATUS_LABELS[value] }))}
              onChange={(event) =>
                setStatus(
                  CREATE_STATUSES.find((value) => value === event.target.value) ?? 'confirmed'
                )
              }
              data-test-subj="investigationAddLinkStatus"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationAddLinkCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isLoading}
          onClick={submit}
          data-test-subj="investigationAddLinkSubmit"
        >
          {i18n.ADD_LINK_SUBMIT}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
AddLinkModal.displayName = 'AddLinkModal';
