/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Alert } from '@kbn/alerting-types';
import type { CasesOwner, CasesService } from '../types';

export const useCaseActions = ({
  alerts,
  cases,
  owner,
  onAddToCase,
}: {
  alerts: Alert[];
  cases?: CasesService;
  owner: CasesOwner[];
  onAddToCase?: (opts: { isNewCase: boolean }) => void;
}) => {
  const selectCaseModal = cases?.hooks.useCasesAddToExistingCaseModal({
    onSuccess: (_, isNewCase) => onAddToCase?.({ isNewCase }),
  });

  const [defaultOwner] = owner;

  const getCaseAttachments = useCallback(
    (caseOwner?: string) => {
      const attachmentOwner = caseOwner ?? defaultOwner;
      if (!cases || !attachmentOwner) {
        return [];
      }

      // One attachment per alert, so alerts that share a rule are not merged.
      return alerts.flatMap((alert) =>
        cases.helpers.groupAlertsByRule(
          [
            {
              ecs: {
                _id: alert._id ?? '',
                _index: alert._index ?? '',
              },
              data: Object.entries(alert).reduce<Array<{ field: string; value: string[] }>>(
                (acc, [field, value]) => [...acc, { field, value: value as string[] }],
                []
              ),
            },
          ],
          attachmentOwner
        )
      );
    },
    [alerts, cases, defaultOwner]
  );

  const handleAddToCaseClick = useCallback(() => {
    selectCaseModal?.open({
      getAttachments: ({ theCase }) => getCaseAttachments(theCase?.owner),
    });
  }, [selectCaseModal, getCaseAttachments]);

  return {
    handleAddToCaseClick,
  };
};
