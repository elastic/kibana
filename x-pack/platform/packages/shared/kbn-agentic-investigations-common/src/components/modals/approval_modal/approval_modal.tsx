/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiModal, useEuiTheme } from '@elastic/eui';
import type { Investigation } from '../../../types';
import { getActionButtonIconProps } from '../../helpers';
import { ApprovalContent } from './approval_content';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

const TITLE_ID = 'approvalModalTitle';

export interface ApprovalModalProps {
  alwaysAllow?: {
    id: string;
    label: React.ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  selectedRecommendedActionConversation?: Investigation;
  onConfirm: () => void;
  onClose: () => void;
  'data-test-subj'?: string;
}

export const ApprovalModal = memo<ApprovalModalProps>(
  ({
    alwaysAllow,
    selectedRecommendedActionConversation,
    onConfirm,
    onClose,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();

    const title = selectedRecommendedActionConversation?.primaryActionLabel ?? '';

    const recommendedActionIconProps = useMemo(
      () =>
        selectedRecommendedActionConversation
          ? getActionButtonIconProps(selectedRecommendedActionConversation)
          : { type: 'gear' as const, color: 'primary' as const },
      [selectedRecommendedActionConversation]
    );

    const tone =
      recommendedActionIconProps.color === 'danger' ? ('danger' as const) : ('primary' as const);

    return (
      <EuiModal
        aria-labelledby={TITLE_ID}
        onClose={onClose}
        css={css({ maxWidth: 560, width: '100%', borderRadius: euiTheme.size.m })}
        data-test-subj={dataTestSubj}
      >
        <ApprovalContent
          title={title}
          tone={tone}
          iconType={recommendedActionIconProps.type}
          blastRadius={{
            variant: 'description',
            description: selectedRecommendedActionConversation?.summary ?? '',
          }}
          titleId={TITLE_ID}
          warningLabel={APPROVAL_MODAL_TRANSLATIONS.warningLabel}
          alwaysAllow={alwaysAllow}
          primaryAction={{
            label: title,
            iconType: recommendedActionIconProps.type,
            onClick: onConfirm,
            'data-test-subj': dataTestSubj ? `${dataTestSubj}-confirm` : undefined,
          }}
          secondaryActions={[
            {
              label: APPROVAL_MODAL_TRANSLATIONS.cancel,
              color: 'text',
              onClick: onClose,
              'data-test-subj': dataTestSubj ? `${dataTestSubj}-cancel` : undefined,
            },
          ]}
        />
      </EuiModal>
    );
  }
);

ApprovalModal.displayName = 'ApprovalModal';
