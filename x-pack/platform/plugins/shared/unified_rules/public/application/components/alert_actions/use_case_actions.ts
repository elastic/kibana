/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { useCallback } from 'react';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { Alert } from '@kbn/alerting-types';
import type { CasesService } from '@kbn/response-ops-alerts-table/types';

interface EventNonEcsData {
  field: string;
  value: string[];
}

export const useCaseActions = ({
  alerts,
  onAddToCase,
  onClosePopover,
  services,
}: {
  alerts: Alert[];
  onAddToCase?: ({ isNewCase }: { isNewCase: boolean }) => void;
  onClosePopover?: () => void;
  services: {
    /**
     * The cases service is optional: cases features will be disabled if not provided
     */
    cases?: CasesService;
  };
}) => {
  const { cases } = services;

  const onAddToExistingCase = useCallback(() => {
    onAddToCase?.({ isNewCase: false });
  }, [onAddToCase]);

  const onAddToNewCase = useCallback(() => {
    onAddToCase?.({ isNewCase: true });
  }, [onAddToCase]);

  const selectCaseModal = cases?.hooks.useCasesAddToExistingCaseModal({
    onSuccess: onAddToExistingCase,
  });

  const getCaseAttachments = (): CaseAttachmentsWithoutOwner => {
    return alerts.map((alert) => ({
      alertId: alert?._id ?? '',
      index: alert?._index ?? '',
      type: AttachmentType.alert,
      rule: cases?.helpers.getRuleIdFromEvent({
        ecs: {
          _id: alert?._id ?? '',
          _index: alert?._index ?? '',
        },
        data:
          Object.entries(alert ?? {}).reduce<EventNonEcsData[]>(
            (acc, [field, value]) => [...acc, { field, value: value as string[] }],
            []
          ) ?? [],
      }) ?? { id: '', name: '' },
    }));
  };

  const createCaseFlyout = cases?.hooks.useCasesAddToNewCaseFlyout({ onSuccess: onAddToNewCase });

  const handleAddToNewCaseClick = () => {
    createCaseFlyout?.open({ attachments: getCaseAttachments() });
    onClosePopover?.();
  };

  const handleAddToExistingCaseClick = () => {
    selectCaseModal?.open({ getAttachments: () => getCaseAttachments() });
    onClosePopover?.();
  };

  return {
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
  };
};
