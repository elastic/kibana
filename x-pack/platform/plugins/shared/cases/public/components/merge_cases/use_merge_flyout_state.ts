/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer, useState } from 'react';
import { MAX_CASES_TO_MERGE } from '../../../common/constants';
import type { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import { CaseStatuses as CaseStatusValues } from '../../../common/types/domain';
import type { CaseUI } from '../../containers/types';
import type {
  CustomFieldChoice,
  MergeFieldChoices,
  MergeFieldKey,
  MergeSingleFieldKey,
  MergeInto,
  MergeStep,
} from './utils';
import { getChoiceKeys, withoutFieldChoice } from './utils';

/** What the flyout shows for a selected case before its preview arrives. */
export interface MergeCaseSummary {
  id: string;
  title: string;
  incrementalId: number | null;
  status: CaseStatuses;
  severity: CaseSeverity;
  totalAlerts: number;
  owner: string;
}

export interface MergeFlyoutState {
  cases: MergeCaseSummary[];
  /** A new case unless the user can't create one. */
  mergeInto: MergeInto;
  /** The case kept when merging into one of the cases. */
  destinationCaseId?: string;
  choices: MergeFieldChoices;
  /** Fields the server refused after the user chose them, so the user must choose again. */
  needsReview: ReadonlySet<MergeFieldKey>;
  /** Why the AI chose a field's value, until the user changes it. */
  aiReasons: ReadonlyMap<MergeFieldKey, string>;
  excludedKeys: ReadonlySet<string>;
  closeSources: boolean;
  /** Shown after the server refused the merge because the cases changed. */
  showChangedNotice: boolean;
  step: MergeStep;
  /** Steps the user has been on, or passed because they had nothing to decide. */
  visitedSteps: ReadonlySet<MergeStep>;
  /** The field to scroll to and focus when the Differences step opens, e.g. from Review's Edit. */
  focusField?: MergeFieldKey;
}

type MergeFlyoutAction =
  | { type: 'addCase'; theCase: MergeCaseSummary }
  | { type: 'removeCase'; caseId: string }
  | { type: 'setMergeInto'; mergeInto: MergeInto }
  | { type: 'setDestination'; caseId?: string }
  | {
      type: 'setField';
      field: MergeSingleFieldKey;
      value: MergeFieldChoices[MergeSingleFieldKey];
    }
  | { type: 'setCustomField'; key: string; choice: CustomFieldChoice }
  | { type: 'setExtendedField'; key: string; value: string }
  | { type: 'clearField'; key: MergeFieldKey }
  | { type: 'setExclusions'; excludedKeys: ReadonlySet<string> }
  | { type: 'setCloseSources'; closeSources: boolean }
  | { type: 'applyChoices'; choices: MergeFieldChoices }
  | {
      type: 'applyAiResolution';
      choices: MergeFieldChoices;
      reasons: ReadonlyMap<MergeFieldKey, string>;
    }
  | { type: 'markForReview'; keys: MergeFieldKey[] }
  | { type: 'dismissChangedNotice' }
  | { type: 'goTo'; step: MergeStep; passed: MergeStep[]; focusField?: MergeFieldKey };

const withoutReview = (
  needsReview: ReadonlySet<MergeFieldKey>,
  key: MergeFieldKey
): ReadonlySet<MergeFieldKey> => {
  if (!needsReview.has(key)) {
    return needsReview;
  }
  const next = new Set(needsReview);
  next.delete(key);
  return next;
};

const withoutAiReasons = (
  aiReasons: ReadonlyMap<MergeFieldKey, string>,
  keys: Iterable<MergeFieldKey>
): ReadonlyMap<MergeFieldKey, string> => {
  const toDrop = [...keys].filter((key) => aiReasons.has(key));
  if (toDrop.length === 0) {
    return aiReasons;
  }
  const next = new Map(aiReasons);
  toDrop.forEach((key) => next.delete(key));
  return next;
};

/** Sets every field in `choices`, replacing what is set, as a bulk action does. */
const applyChoicesToState = (
  state: MergeFlyoutState,
  choices: MergeFieldChoices
): MergeFlyoutState => {
  const { customFields, extendedFields, ...singleFields } = choices;
  const applied = new Set(getChoiceKeys(choices));
  return {
    ...state,
    choices: {
      ...state.choices,
      ...singleFields,
      ...(customFields != null
        ? { customFields: { ...state.choices.customFields, ...customFields } }
        : {}),
      ...(extendedFields != null
        ? { extendedFields: { ...state.choices.extendedFields, ...extendedFields } }
        : {}),
    },
    needsReview: new Set([...state.needsReview].filter((key) => !applied.has(key))),
    aiReasons: withoutAiReasons(state.aiReasons, applied),
  };
};

export const mergeFlyoutReducer = (
  state: MergeFlyoutState,
  action: MergeFlyoutAction
): MergeFlyoutState => {
  switch (action.type) {
    case 'addCase':
      if (
        state.cases.length >= MAX_CASES_TO_MERGE ||
        state.cases.some(({ id }) => id === action.theCase.id)
      ) {
        return state;
      }
      return { ...state, cases: [...state.cases, action.theCase] };
    case 'removeCase':
      return {
        ...state,
        cases: state.cases.filter(({ id }) => id !== action.caseId),
        destinationCaseId:
          state.destinationCaseId === action.caseId ? undefined : state.destinationCaseId,
      };
    case 'setMergeInto':
      return {
        ...state,
        mergeInto: action.mergeInto,
        destinationCaseId: action.mergeInto === 'new' ? undefined : state.destinationCaseId,
      };
    case 'setDestination':
      return { ...state, mergeInto: 'existing', destinationCaseId: action.caseId };
    case 'setField':
      return {
        ...state,
        choices: { ...state.choices, [action.field]: action.value },
        needsReview: withoutReview(state.needsReview, action.field),
        aiReasons: withoutAiReasons(state.aiReasons, [action.field]),
      };
    case 'setCustomField':
      return {
        ...state,
        choices: {
          ...state.choices,
          customFields: { ...state.choices.customFields, [action.key]: action.choice },
        },
        needsReview: withoutReview(state.needsReview, `customFields.${action.key}`),
        aiReasons: withoutAiReasons(state.aiReasons, [`customFields.${action.key}`]),
      };
    case 'setExtendedField':
      return {
        ...state,
        choices: {
          ...state.choices,
          extendedFields: { ...state.choices.extendedFields, [action.key]: action.value },
        },
        needsReview: withoutReview(state.needsReview, `extendedFields.${action.key}`),
        aiReasons: withoutAiReasons(state.aiReasons, [`extendedFields.${action.key}`]),
      };
    case 'clearField':
      return {
        ...state,
        choices: withoutFieldChoice(state.choices, action.key),
        needsReview: withoutReview(state.needsReview, action.key),
        aiReasons: withoutAiReasons(state.aiReasons, [action.key]),
      };
    case 'applyChoices':
      return applyChoicesToState(state, action.choices);
    case 'applyAiResolution': {
      const next = applyChoicesToState(state, action.choices);
      const applied = new Set(getChoiceKeys(action.choices));
      const aiReasons = new Map(next.aiReasons);
      action.reasons.forEach((reason, key) => {
        if (applied.has(key)) {
          aiReasons.set(key, reason);
        }
      });
      return { ...next, aiReasons };
    }
    case 'goTo':
      return {
        ...state,
        step: action.step,
        visitedSteps: new Set([...state.visitedSteps, ...action.passed, action.step]),
        focusField: action.focusField,
      };
    case 'setExclusions':
      return { ...state, excludedKeys: action.excludedKeys };
    case 'setCloseSources':
      return { ...state, closeSources: action.closeSources };
    case 'markForReview':
      return {
        ...state,
        needsReview: new Set([...state.needsReview, ...action.keys]),
        showChangedNotice: true,
      };
    case 'dismissChangedNotice':
      return { ...state, showChangedNotice: false };
    default:
      return state;
  }
};

export const toMergeCaseSummary = ({
  id,
  title,
  incrementalId,
  status,
  severity,
  totalAlerts,
  owner,
}: Pick<
  CaseUI,
  'id' | 'title' | 'incrementalId' | 'status' | 'severity' | 'totalAlerts' | 'owner'
>): MergeCaseSummary => ({
  id,
  title,
  incrementalId: incrementalId ?? null,
  status,
  severity,
  totalAlerts,
  owner,
});

export const getInitialMergeFlyoutState = ({
  initialCases,
  canCreate,
}: {
  initialCases: MergeCaseSummary[];
  canCreate: boolean;
}): MergeFlyoutState => ({
  cases: initialCases.slice(0, MAX_CASES_TO_MERGE),
  // Without the create privilege the merge can only go into one of the open cases.
  mergeInto: canCreate ? 'new' : 'existing',
  destinationCaseId: canCreate
    ? undefined
    : initialCases.find(({ status }) => status !== CaseStatusValues.closed)?.id,
  choices: {},
  needsReview: new Set(),
  aiReasons: new Map(),
  excludedKeys: new Set(),
  closeSources: true,
  showChangedNotice: false,
  step: 'cases',
  visitedSteps: new Set(['cases']),
});

/** Whether the user changed anything, so closing the flyout asks to discard it. */
export const isMergeFlyoutDirty = (
  state: MergeFlyoutState,
  initialState: MergeFlyoutState
): boolean =>
  state.cases.map(({ id }) => id).join() !== initialState.cases.map(({ id }) => id).join() ||
  state.mergeInto !== initialState.mergeInto ||
  state.destinationCaseId !== initialState.destinationCaseId ||
  Object.keys(state.choices).length > 0 ||
  state.excludedKeys.size > 0 ||
  state.closeSources !== initialState.closeSources;

export const useMergeFlyoutState = ({
  initialCases,
  canCreate,
}: {
  initialCases: MergeCaseSummary[];
  canCreate: boolean;
}) => {
  // Computed once, when the flyout opens.
  const [initialState] = useState(() => getInitialMergeFlyoutState({ initialCases, canCreate }));
  const [state, dispatch] = useReducer(mergeFlyoutReducer, initialState);

  const setField = useCallback(
    <K extends MergeSingleFieldKey>(field: K, value: MergeFieldChoices[K]) =>
      dispatch({ type: 'setField', field, value }),
    []
  );
  const setCustomField = useCallback(
    (key: string, choice: CustomFieldChoice) => dispatch({ type: 'setCustomField', key, choice }),
    []
  );
  const setExtendedField = useCallback(
    (key: string, value: string) => dispatch({ type: 'setExtendedField', key, value }),
    []
  );
  /** Drops the user's value for a field, so it takes the server's default again. */
  const clearField = useCallback((key: MergeFieldKey) => dispatch({ type: 'clearField', key }), []);
  const addCase = useCallback(
    (theCase: MergeCaseSummary) => dispatch({ type: 'addCase', theCase }),
    []
  );
  const removeCase = useCallback((caseId: string) => dispatch({ type: 'removeCase', caseId }), []);
  const setMergeInto = useCallback(
    (mergeInto: MergeInto) => dispatch({ type: 'setMergeInto', mergeInto }),
    []
  );
  const setDestination = useCallback(
    (caseId?: string) => dispatch({ type: 'setDestination', caseId }),
    []
  );
  const setExclusions = useCallback(
    (excludedKeys: ReadonlySet<string>) => dispatch({ type: 'setExclusions', excludedKeys }),
    []
  );
  const setCloseSources = useCallback(
    (closeSources: boolean) => dispatch({ type: 'setCloseSources', closeSources }),
    []
  );
  const markForReview = useCallback(
    (keys: MergeFieldKey[]) => dispatch({ type: 'markForReview', keys }),
    []
  );
  const dismissChangedNotice = useCallback(() => dispatch({ type: 'dismissChangedNotice' }), []);
  const applyChoices = useCallback(
    (choices: MergeFieldChoices) => dispatch({ type: 'applyChoices', choices }),
    []
  );
  const applyAiResolution = useCallback(
    (choices: MergeFieldChoices, reasons: ReadonlyMap<MergeFieldKey, string>) =>
      dispatch({ type: 'applyAiResolution', choices, reasons }),
    []
  );
  /** Moves to a step. `passed` are steps skipped on the way, which count as visited. */
  const goTo = useCallback(
    (
      step: MergeStep,
      { passed = [], focusField }: { passed?: MergeStep[]; focusField?: MergeFieldKey } = {}
    ) => dispatch({ type: 'goTo', step, passed, focusField }),
    []
  );

  return {
    state,
    isDirty: isMergeFlyoutDirty(state, initialState),
    setField,
    setCustomField,
    setExtendedField,
    clearField,
    addCase,
    removeCase,
    setMergeInto,
    setDestination,
    setExclusions,
    setCloseSources,
    markForReview,
    dismissChangedNotice,
    applyChoices,
    applyAiResolution,
    goTo,
  };
};
