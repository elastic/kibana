/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  ExternalTicketResponse,
  UpdateExternalTicketRequest,
} from '../../../../common/investigations/types';
import {
  getExternalTicket,
  pushExternalTicket,
  syncExternalTicket,
  updateExternalTicket,
} from '../../api/client';
import { investigationKeys } from '../../api/query_keys';
import { useInvestigationToasts } from '../../hooks';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { useInvestigationsServices } from '../../services';
import * as i18n from './translations';

/** Under the record scope, so the live poller and every record write refresh it. */
const externalTicketKey = (recordId: string) =>
  [...investigationKeys.recordScope(recordId), 'external_ticket'] as const;

export const useExternalTicket = (recordId: string) => {
  const { http } = useInvestigationsServices();

  return useQuery(externalTicketKey(recordId), () => getExternalTicket(http, recordId), {
    enabled: recordId.length > 0,
    retry: false,
  });
};

const useInvalidate = (recordId: string) => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    void queryClient.invalidateQueries(investigationKeys.findAll());
  };
};

/** Sets or removes the connector, or switches automatic push. */
export const useUpdateExternalTicket = (recordId: string, errorTitle: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidate(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation(
    (body: UpdateExternalTicketRequest) => updateExternalTicket(http, recordId, body),
    {
      onSuccess: invalidate,
      onError: (error) => showError(error, errorTitle),
    }
  );
};

/** The Cases push: creates the incident the first time and updates it afterwards. */
export const usePushExternalTicket = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidate(recordId);
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation<ExternalTicketResponse, unknown, { connectorName: string; update: boolean }>(
    () => pushExternalTicket(http, recordId),
    {
      onSuccess: (ticket, { connectorName, update }) => {
        const externalId = ticket.external_service?.external_id ?? '';
        showSuccess(
          update
            ? i18n.UPDATE_SUCCESS(connectorName, externalId)
            : i18n.PUSH_SUCCESS(connectorName, externalId)
        );
        invalidate();
      },
      onError: (error, { connectorName }) => showError(error, i18n.PUSH_ERROR(connectorName)),
    }
  );
};

/** Pulls the incident's title, description and status. */
export const useSyncExternalTicket = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidate(recordId);
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation<ExternalTicketResponse, unknown, { connectorName: string }>(
    () => syncExternalTicket(http, recordId),
    {
      onSuccess: (ticket, { connectorName }) => {
        const changes = ticket.last_sync?.changes ?? [];
        showSuccess(
          changes.length > 0
            ? i18n.SYNC_SUCCESS(connectorName, changes.join(', '))
            : i18n.SYNC_NOTHING_NEW(connectorName)
        );
        invalidate();
      },
      onError: (error, { connectorName }) => showError(error, i18n.SYNC_ERROR(connectorName)),
    }
  );
};

export interface TicketMenuItem {
  name: string;
  icon: string;
  onClick: () => void;
  disabled: boolean;
  'data-test-subj': string;
}

/**
 * Take action entries: "Push to <connector>" before the first push and "Update <connector>
 * incident" when the case changed since. None while the incident is up to date.
 */
/**
 * The Take action entry for the external ticket. It leads to the External ticket card, which owns
 * the connector, push/update and sync controls (one control per concept).
 */
export const useExternalTicketMenuItems = (
  icon: string,
  closeMenu: () => void
): TicketMenuItem[] => {
  const { permissions } = useCasesContext();
  return useMemo(() => {
    if (!permissions.push) return [];
    return [
      {
        name: i18n.TAKE_ACTION_ENTRY,
        icon,
        onClick: () => {
          closeMenu();
          const card = document.querySelector<HTMLElement>(
            '[data-test-subj="investigationExternalTicketCard"]'
          );
          card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          card
            ?.querySelector<HTMLElement>(
              '[data-test-subj="investigationTicketPush"], [data-test-subj="investigationTicketConnector"], button'
            )
            ?.focus({ preventScroll: true });
        },
        disabled: false,
        'data-test-subj': 'investigationActionPushTicket',
      },
    ];
  }, [icon, closeMenu, permissions.push]);
};
