/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormMessage, State, SourceIndexMap } from './state';

export enum ACTION {
  ADD_REQUEST_MESSAGE,
  RESET_REQUEST_MESSAGES,
  CLOSE_MODAL,
  OPEN_MODAL,
  RESET_ADVANCED_EDITOR_MESSAGES,
  RESET_FORM,
  SET_ADVANCED_EDITOR_RAW_STRING,
  SET_FORM_STATE,
  SET_INDEX_NAMES,
  SET_INDEX_PATTERN_TITLES,
  SET_IS_JOB_CREATED,
  SET_IS_JOB_STARTED,
  SET_IS_MODAL_BUTTON_DISABLED,
  SET_IS_MODAL_VISIBLE,
  SET_JOB_CONFIG,
  SET_JOB_IDS,
  SWITCH_TO_ADVANCED_EDITOR,
}

export type Action =
  // Actions which only consist of the action type and no payload:
  | {
      type:
        | ACTION.RESET_REQUEST_MESSAGES
        | ACTION.CLOSE_MODAL
        | ACTION.OPEN_MODAL
        | ACTION.RESET_ADVANCED_EDITOR_MESSAGES
        | ACTION.RESET_FORM
        | ACTION.SWITCH_TO_ADVANCED_EDITOR;
    }
  // Actions with custom payloads:
  | { type: ACTION.ADD_REQUEST_MESSAGE; requestMessage: FormMessage }
  | {
      type: ACTION.SET_ADVANCED_EDITOR_RAW_STRING;
      advancedEditorRawString: State['advancedEditorRawString'];
    }
  | { type: ACTION.SET_FORM_STATE; payload: Partial<State['form']> }
  | { type: ACTION.SET_INDEX_NAMES; indexNames: State['indexNames'] }
  | {
      type: ACTION.SET_INDEX_PATTERN_TITLES;
      payload: {
        indexPatternsMap: SourceIndexMap;
      };
    }
  | { type: ACTION.SET_IS_JOB_CREATED; isJobCreated: State['isJobCreated'] }
  | { type: ACTION.SET_IS_JOB_STARTED; isJobStarted: State['isJobStarted'] }
  | {
      type: ACTION.SET_IS_MODAL_BUTTON_DISABLED;
      isModalButtonDisabled: State['isModalButtonDisabled'];
    }
  | { type: ACTION.SET_IS_MODAL_VISIBLE; isModalVisible: State['isModalVisible'] }
  | { type: ACTION.SET_JOB_CONFIG; payload: State['jobConfig'] }
  | { type: ACTION.SET_JOB_IDS; jobIds: State['jobIds'] };

// Actions wrapping the dispatcher exposed by the custom hook
export interface ActionDispatchers {
  closeModal: () => void;
  createAnalyticsJob: () => void;
  openModal: () => void;
  resetAdvancedEditorMessages: () => void;
  setAdvancedEditorRawString: (payload: State['advancedEditorRawString']) => void;
  setFormState: (payload: Partial<State['form']>) => void;
  setIsModalVisible: (payload: State['isModalVisible']) => void;
  setJobConfig: (payload: State['jobConfig']) => void;
  startAnalyticsJob: () => void;
  switchToAdvancedEditor: () => void;
}
