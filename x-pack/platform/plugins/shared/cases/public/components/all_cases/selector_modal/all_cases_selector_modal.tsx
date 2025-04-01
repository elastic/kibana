/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { CaseStatuses } from '../../../../common/types/domain';
import type { CaseUI } from '../../../../common/ui/types';
import * as i18n from '../../../common/translations';
import { AllCasesList } from '../all_cases_list';

export interface AllCasesSelectorModalProps {
  hiddenStatuses?: CaseStatuses[];
  onRowClick?: (theCase?: CaseUI) => void;
  onClose?: (theCase?: CaseUI, isCreateCase?: boolean) => void;
  onCreateCaseClicked?: () => void;
}

export const AllCasesSelectorModal = React.memo<AllCasesSelectorModalProps>(
  ({ hiddenStatuses, onRowClick, onClose }) => {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
    const { euiTheme } = useEuiTheme();
    const closeModal = useCallback(() => {
      onClose?.();
      setIsModalOpen(false);
    }, [onClose]);

    const onClick = useCallback(
      (theCase?: CaseUI, isCreateCase?: boolean) => {
        onClose?.(theCase, isCreateCase);
        setIsModalOpen(false);

        onRowClick?.(theCase);
      },
      [onClose, onRowClick]
    );

    return isModalOpen ? (
      <>
        <ReactQueryDevtools initialIsOpen={false} />
        <EuiModal
          onClose={closeModal}
          data-test-subj="all-cases-modal"
          css={css`
            min-width: ${euiTheme.breakpoint.m}px;
            max-width: ${euiTheme.breakpoint.xl}px;
          `}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>{i18n.SELECT_CASE_TITLE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <AllCasesList
              hiddenStatuses={hiddenStatuses}
              isSelectorView={true}
              onRowClick={onClick}
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              color="primary"
              onClick={closeModal}
              data-test-subj="all-cases-modal-cancel-button"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      </>
    ) : null;
  }
);

AllCasesSelectorModal.displayName = 'AllCasesSelectorModal';
