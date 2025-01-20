/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Transaction } from '@elastic/apm-rum';
import { useCallback } from 'react';
import { AttachmentType } from '../../../common/types/domain';
import type { CaseAttachmentsWithoutOwner } from '../../types';
import { useStartTransaction } from './use_start_transaction';

const CREATE_CASE = 'createCase' as const;
const ADD_ATTACHMENT_TO_NEW_CASE = 'addAttachmentToNewCase' as const;
const BULK_ADD_ATTACHMENT_TO_NEW_CASE = 'bulkAddAttachmentsToNewCase' as const;
const ADD_ATTACHMENT_TO_EXISTING_CASE = 'addAttachmentToExistingCase' as const;
const BULK_ADD_ATTACHMENT_TO_EXISTING_CASE = 'bulkAddAttachmentsToExistingCase' as const;

export type StartCreateCaseWithAttachmentsTransaction = (param?: {
  appId?: string;
  attachments?: CaseAttachmentsWithoutOwner;
}) => Transaction | undefined;

// Called when a case is created, attachments are optional
export const useCreateCaseWithAttachmentsTransaction = () => {
  const { startTransaction } = useStartTransaction();

  const startCreateCaseWithAttachmentsTransaction =
    useCallback<StartCreateCaseWithAttachmentsTransaction>(
      ({ appId, attachments } = {}) => {
        if (!appId) {
          return;
        }

        if (!attachments) {
          return startTransaction(`Cases [${appId}] ${CREATE_CASE}`);
        }

        const alertCount = getAlertCount(attachments);

        if (alertCount <= 1) {
          return startTransaction(`Cases [${appId}] ${ADD_ATTACHMENT_TO_NEW_CASE}`);
        }

        const transaction = startTransaction(`Cases [${appId}] ${BULK_ADD_ATTACHMENT_TO_NEW_CASE}`);
        transaction?.addLabels({ alert_count: alertCount });
        return transaction;
      },
      [startTransaction]
    );

  return { startTransaction: startCreateCaseWithAttachmentsTransaction };
};

export type StartAddAttachmentToExistingCaseTransaction = (param: {
  appId?: string;
  attachments: CaseAttachmentsWithoutOwner;
}) => Transaction | undefined;

// Called when attachments are added to existing case
export const useAddAttachmentToExistingCaseTransaction = () => {
  const { startTransaction } = useStartTransaction();

  const startAddAttachmentToExistingCaseTransaction =
    useCallback<StartAddAttachmentToExistingCaseTransaction>(
      ({ appId, attachments }) => {
        if (!appId) {
          return;
        }

        const alertCount = getAlertCount(attachments);

        if (alertCount <= 1) {
          return startTransaction(`Cases [${appId}] ${ADD_ATTACHMENT_TO_EXISTING_CASE}`);
        }

        const transaction = startTransaction(
          `Cases [${appId}] ${BULK_ADD_ATTACHMENT_TO_EXISTING_CASE}`
        );

        transaction?.addLabels({ alert_count: alertCount });
        return transaction;
      },
      [startTransaction]
    );

  return { startTransaction: startAddAttachmentToExistingCaseTransaction };
};

const getAlertCount = (attachments: CaseAttachmentsWithoutOwner) => {
  return attachments.reduce((total, attachment) => {
    if (attachment.type !== AttachmentType.alert) {
      return total;
    }
    if (!Array.isArray(attachment.alertId)) {
      return total + 1;
    }
    return total + attachment.alertId.length;
  }, 0);
};
