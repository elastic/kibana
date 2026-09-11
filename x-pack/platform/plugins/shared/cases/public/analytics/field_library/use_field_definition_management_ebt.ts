/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import {
  CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
  CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
  CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { getEbtOwner } from '../get_ebt_owner';

/**
 * Events Based Tracking for a field definition created from the Field Library. Report this only once
 * the server has confirmed the write, never on render and never when the flyout opens.
 *
 * `isGlobal` is required rather than optional even though the domain type allows it to be absent: a
 * definition either applies to every case or it does not, and an absent flag means the second. Pass
 * the value the save resolved to, so the caller decides what absence means instead of this reporter
 * guessing.
 */
export const useFieldDefinitionCreatedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({ isGlobal }: { isGlobal: boolean }) => {
      analytics.reportEvent(CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        is_global: isGlobal,
      });
    },
    [analytics, owner]
  );
};

/**
 * Events Based Tracking for a field definition updated from the Field Library. Report this only once
 * the server has confirmed the write, never on render.
 *
 * Reordering the global fields also writes through the update endpoint, one write per definition in
 * the list. It is not a reportable edit and must not call this reporter, or a single drag would
 * report as many edits as the list is long — which is exactly how the server-side
 * `update_field_definition` counter behaves, and the reason these events are kept separate from it.
 */
export const useFieldDefinitionUpdatedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({ isGlobal }: { isGlobal: boolean }) => {
      analytics.reportEvent(CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        is_global: isGlobal,
      });
    },
    [analytics, owner]
  );
};

/**
 * Events Based Tracking for a field definition deleted from the Field Library. Report this only once
 * the server has confirmed the write, so that a delete the server rejects reports nothing. The
 * server rejects a definition that a template still references, and one that is still linked to an
 * active custom field.
 *
 * Carries no scope: the definition is gone, and the server delete counter has no global/reusable
 * split to join against either.
 */
export const useFieldDefinitionDeletedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(() => {
    analytics.reportEvent(CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE, {
      owner: getEbtOwner(owner),
    });
  }, [analytics, owner]);
};
