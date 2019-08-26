/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormMessage, State } from './state';

export enum ACTION {
  ADD_REQUEST_MESSAGE = 'add_request_message',
  RESET_REQUEST_MESSAGES = 'reset_request_messages',
  CLOSE_MODAL = 'close_modal',
  OPEN_MODAL = 'open_modal',
  RESET_ADVANCED_EDITOR_MESSAGES = 'reset_advanced_editor_messages',
  RESET_FORM = 'reset_form',
  SET_ADVANCED_EDITOR_STR = 'set_advanced_editor_str',
  SET_FORM_STATE = 'set_form_state',
  SET_INDEX_NAMES = 'set_index_names',
  SET_INDEX_PATTERN_TITLES = 'set_index_pattern_titles',
  SET_IS_JOB_CREATED = 'set_is_job_created',
  SET_IS_JOB_STARTED = 'set_is_job_started',
  SET_IS_MODAL_BUTTON_DISABLED = 'set_is_modal_button_disabled',
  SET_IS_MODAL_VISIBLE = 'set_is_modal_visible',
  SET_JOB_CONFIG = 'set_job_config',
  SET_JOB_IDS = 'set_job_ids',
  SWITCH_TO_ADVANCED_EDITOR = 'switch_to_advanced_editor',
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
  | { type: ACTION.SET_ADVANCED_EDITOR_STR; advancedEditorStr: State['advancedEditorStr'] }
  | { type: ACTION.SET_FORM_STATE; payload: Partial<State['form']> }
  | { type: ACTION.SET_INDEX_NAMES; indexNames: State['indexNames'] }
  | {
      type: ACTION.SET_INDEX_PATTERN_TITLES;
      payload: {
        indexPatternTitles: State['indexPatternTitles'];
        indexPatternsWithNumericFields: State['indexPatternsWithNumericFields'];
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
export interface Actions {
  closeModal: () => void;
  createAnalyticsJob: () => void;
  openModal: () => void;
  resetAdvancedEditorMessages: () => void;
  setAdvancedEditorStr: (payload: State['advancedEditorStr']) => void;
  setFormState: (payload: Partial<State['form']>) => void;
  setIsModalVisible: (payload: State['isModalVisible']) => void;
  setJobConfig: (payload: State['jobConfig']) => void;
  startAnalyticsJob: () => void;
  switchToAdvancedEditor: () => void;
}
