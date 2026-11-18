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
} from './utils';

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
  /** Absent means a new case. */
  destinationCaseId?: string;
  choices: MergeFieldChoices;
  /** Fields the server refused after the user chose them, so the user must choose again. */
  needsReview: ReadonlySet<MergeFieldKey>;
  excludedKeys: ReadonlySet<string>;
  closeSources: boolean;
  /** `null` while "Add a note" is closed. */
  note: string | null;
  /** Shown after the server refused the merge because the cases changed. */
  showChangedNotice: boolean;
}

type MergeFlyoutAction =
  | { type: 'addCase'; theCase: MergeCaseSummary }
  | { type: 'removeCase'; caseId: string }
  | { type: 'setDestination'; caseId?: string }
  | {
      type: 'setField';
      field: MergeSingleFieldKey;
      value: MergeFieldChoices[MergeSingleFieldKey];
    }
  | { type: 'setCustomField'; key: string; choice: CustomFieldChoice }
  | { type: 'setExtendedField'; key: string; value: string }
  | { type: 'setExclusions'; excludedKeys: ReadonlySet<string> }
  | { type: 'setCloseSources'; closeSources: boolean }
  | { type: 'setNote'; note: string | null }
  | { type: 'markForReview'; keys: MergeFieldKey[] }
  | { type: 'dismissChangedNotice' };

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
    case 'setDestination':
      return { ...state, destinationCaseId: action.caseId };
    case 'setField':
      return {
        ...state,
        choices: { ...state.choices, [action.field]: action.value },
        needsReview: withoutReview(state.needsReview, action.field),
      };
    case 'setCustomField':
      return {
        ...state,
        choices: {
          ...state.choices,
          customFields: { ...state.choices.customFields, [action.key]: action.choice },
        },
        needsReview: withoutReview(state.needsReview, `customFields.${action.key}`),
      };
    case 'setExtendedField':
      return {
        ...state,
        choices: {
          ...state.choices,
          extendedFields: { ...state.choices.extendedFields, [action.key]: action.value },
        },
        needsReview: withoutReview(state.needsReview, `extendedFields.${action.key}`),
      };
    case 'setExclusions':
      return { ...state, excludedKeys: action.excludedKeys };
    case 'setCloseSources':
      return { ...state, closeSources: action.closeSources };
    case 'setNote':
      return { ...state, note: action.note };
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
  destinationCaseId: canCreate
    ? undefined
    : initialCases.find(({ status }) => status !== CaseStatusValues.closed)?.id,
  choices: {},
  needsReview: new Set(),
  excludedKeys: new Set(),
  closeSources: true,
  note: null,
  showChangedNotice: false,
});

/** Whether the user changed anything, so closing the flyout asks to discard it. */
export const isMergeFlyoutDirty = (
  state: MergeFlyoutState,
  initialState: MergeFlyoutState
): boolean =>
  state.cases.map(({ id }) => id).join() !== initialState.cases.map(({ id }) => id).join() ||
  state.destinationCaseId !== initialState.destinationCaseId ||
  Object.keys(state.choices).length > 0 ||
  state.excludedKeys.size > 0 ||
  state.closeSources !== initialState.closeSources ||
  (state.note ?? '').trim().length > 0;

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
  const addCase = useCallback(
    (theCase: MergeCaseSummary) => dispatch({ type: 'addCase', theCase }),
    []
  );
  const removeCase = useCallback((caseId: string) => dispatch({ type: 'removeCase', caseId }), []);
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
  const setNote = useCallback((note: string | null) => dispatch({ type: 'setNote', note }), []);
  const markForReview = useCallback(
    (keys: MergeFieldKey[]) => dispatch({ type: 'markForReview', keys }),
    []
  );
  const dismissChangedNotice = useCallback(() => dispatch({ type: 'dismissChangedNotice' }), []);

  return {
    state,
    isDirty: isMergeFlyoutDirty(state, initialState),
    setField,
    setCustomField,
    setExtendedField,
    addCase,
    removeCase,
    setDestination,
    setExclusions,
    setCloseSources,
    setNote,
    markForReview,
    dismissChangedNotice,
  };
};
