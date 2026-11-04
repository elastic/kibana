/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import {
  CASES_TEMPLATE_CREATED_EVENT_TYPE,
  CASES_TEMPLATE_DELETED_EVENT_TYPE,
  CASES_TEMPLATE_UPDATED_EVENT_TYPE,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { getEbtOwner } from '../get_ebt_owner';

export type TemplateEntryPoint = 'template_editor' | 'templates_list';
export type TemplateCreationMode = 'blank' | 'clone';
export type TemplateDeleteScope = 'single' | 'bulk';

/**
 * Delete exists only on the templates list (a row action and the bulk menu); the editor has no
 * delete. Narrowed so the reporter cannot send an entry point the UI has no way to reach. Widen this
 * to `TemplateEntryPoint` if a delete is ever added to the editor.
 */
export type TemplateDeleteEntryPoint = Extract<TemplateEntryPoint, 'templates_list'>;

/**
 * Events Based Tracking for a template created from the templates UI. Report this only once the
 * server has confirmed the write, never on render.
 */
export const useTemplateCreatedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({
      entryPoint,
      creationMode,
    }: {
      entryPoint: TemplateEntryPoint;
      creationMode: TemplateCreationMode;
    }) => {
      analytics.reportEvent(CASES_TEMPLATE_CREATED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        entry_point: entryPoint,
        creation_mode: creationMode,
      });
    },
    [analytics, owner]
  );
};

/**
 * Events Based Tracking for a template updated from the templates UI. Report this only once the
 * server has confirmed the write, never on render.
 */
export const useTemplateUpdatedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({ entryPoint }: { entryPoint: TemplateEntryPoint }) => {
      analytics.reportEvent(CASES_TEMPLATE_UPDATED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        entry_point: entryPoint,
      });
    },
    [analytics, owner]
  );
};

/**
 * Events Based Tracking for a template deleted from the templates UI. A bulk delete reports one
 * event for the confirmed action, not one per removed template.
 */
export const useTemplateDeletedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({
      entryPoint,
      deleteScope,
    }: {
      entryPoint: TemplateDeleteEntryPoint;
      deleteScope: TemplateDeleteScope;
    }) => {
      analytics.reportEvent(CASES_TEMPLATE_DELETED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        entry_point: entryPoint,
        delete_scope: deleteScope,
      });
    },
    [analytics, owner]
  );
};
