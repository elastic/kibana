/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiBadge,
  EuiButtonIcon,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EXTRACT_OBSERVABLES_LABEL } from '../create/translations';
import * as i18n from './translations';

const HASH_FIELDS = [
  'cdhash',
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512',
  'ssdeep',
  'tlsh',
] as const;

// https://www.elastic.co/docs/reference/ecs/ecs-hash
// TODO - support 'email.attachments.file'
const HASH_PARENTS = ['dll', 'file', 'process'] as const;

/**
 * Renders a gear icon that opens a modal with the default observable types.
 */
export const DefaultObservableTypesModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const onButtonClick = () => setIsModalOpen((isOpen) => !isOpen);
  const onCancel = useCallback(() => setIsModalOpen(false), []);

  const modalTitleId = useGeneratedHtmlId();
  const modal = useMemo(
    () => (
      <EuiModal
        css={{ width: '600px' }}
        id={modalTitleId}
        onClose={onCancel}
        aria-labelledby={modalTitleId}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle
            id={modalTitleId}
            size="s"
            data-test-subj="default-observable-types-modal-header-title"
          >
            {EXTRACT_OBSERVABLES_LABEL}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody data-test-subj="default-observable-types-modal-body">
          <EuiText size="s">
            <FormattedMessage
              id="xpack.cases.caseView.observables.observablesTable.popoverDescription"
              defaultMessage="These ECS fields are automatically extracted if auto-extract observerable is turned on."
            />
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <strong>{i18n.HOST_NAME}</strong>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="xs" wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{'host.name'}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <strong>{i18n.IP}</strong>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="xs" wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{'source.ip'}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{'destination.ip'}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <strong>{i18n.FILE_PATH}</strong>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="xs" wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{'file.path'}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <strong>{i18n.DOMAIN}</strong>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="xs" wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{'dns.question.name'}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <strong>{i18n.FILE_HASH}</strong>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="xs" wrap>
                {HASH_PARENTS.map((parent) =>
                  HASH_FIELDS.map((field) => (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{`${parent}.hash.${field}`}</EuiBadge>
                    </EuiFlexItem>
                  ))
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
      </EuiModal>
    ),
    [onCancel, modalTitleId]
  );

  return (
    <>
      <EuiButtonIcon
        iconType="gear"
        onClick={onButtonClick}
        size="s"
        color="text"
        data-test-subj="default-observable-types-modal-button"
        aria-label={i18n.DEFAULT_OBSERVABLE_TYPES_MODAL_BUTTON_ARIA_LABEL}
      />
      {isModalOpen && modal}
    </>
  );
};

DefaultObservableTypesModal.displayName = 'DefaultObservableTypesModal';
