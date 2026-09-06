/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import {
  CASES_TEMPLATE_APPLIED_EVENT_TYPE,
  CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE,
  CASES_TEMPLATE_CLEARED_EVENT_TYPE,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { getEbtOwner } from '../get_ebt_owner';

/**
 * The legacy case view is deprecated and is deliberately not instrumented, so its apply-template
 * modal has no entry point here. Only the redesigned case view reports, and it is the default.
 */
export type TemplateApplyEntryPoint = 'create_form' | 'case_view_sidebar';

/**
 * Re-applying the template a case already has is not a reportable mode, because the redesigned
 * sidebar returns early when the selection matches the applied template.
 */
export type TemplateApplyMode = 'initial' | 'replacement';

/**
 * A template can only be chosen before the case exists in the create form. Narrowed so the reporter
 * cannot send an entry point the UI has no way to reach.
 */
export type TemplateCreateEntryPoint = Extract<TemplateApplyEntryPoint, 'create_form'>;

/**
 * A case that already exists is changed from the redesigned sidebar, never from the create form,
 * where no case exists yet.
 */
export type TemplateChangeEntryPoint = Extract<TemplateApplyEntryPoint, 'case_view_sidebar'>;

/**
 * A template is taken off a case from the redesigned sidebar, whose confirmation modal has a remove
 * mode. Kept separate from the change entry point, because the two express different UI rules and
 * will diverge as surfaces are added.
 */
export type TemplateClearEntryPoint = Extract<TemplateApplyEntryPoint, 'case_view_sidebar'>;

/**
 * Events Based Tracking for a case created from a template. Report this only once the server confirms
 * that the created case carries the template, never on selection and never on render.
 */
export const useTemplateAppliedOnCreateEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({ entryPoint }: { entryPoint: TemplateCreateEntryPoint }) => {
      analytics.reportEvent(CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        entry_point: entryPoint,
      });
    },
    [analytics, owner]
  );
};

/**
 * Events Based Tracking for a template applied to a case that already exists. Report this only once
 * the server has confirmed the write, never on render.
 */
export const useTemplateAppliedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({
      entryPoint,
      applyMode,
    }: {
      entryPoint: TemplateChangeEntryPoint;
      applyMode: TemplateApplyMode;
    }) => {
      analytics.reportEvent(CASES_TEMPLATE_APPLIED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        entry_point: entryPoint,
        apply_mode: applyMode,
      });
    },
    [analytics, owner]
  );
};

/**
 * Events Based Tracking for a template removed from a case. Report this only once the server has
 * confirmed the write, never on render.
 */
export const useTemplateClearedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({ entryPoint }: { entryPoint: TemplateClearEntryPoint }) => {
      analytics.reportEvent(CASES_TEMPLATE_CLEARED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        entry_point: entryPoint,
      });
    },
    [analytics, owner]
  );
};
