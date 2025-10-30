/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, forwardRef, memo, useImperativeHandle, useReducer } from 'react';
import {
  EuiConfirmModal,
  EuiCallOut,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  htmlIdGenerator,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core/public';
import type { ExtensionsService } from '../../../../../../services/extensions_service';

import { ConvertToLookupIndexModalContainer } from '../../details_page/convert_to_lookup_index_modal/convert_to_lookup_index_modal_container';
import { navigateToIndexDetailsPage } from '../../../../../services/routing';
import { notificationService } from '../../../../../services/notification';
import { IndexDetailsSection } from '../../../../../../../common/constants';
import type { Index } from '../../../../../../../common';

export type ModalOpenRequest =
  | { kind: 'forcemerge' }
  | { kind: 'delete' }
  | { kind: 'convertToLookup' }
  | { kind: 'extension'; actionIndex: number };

type ModalState =
  | { kind: 'none'; forcemergeSegments: string | null }
  | { kind: 'forcemerge'; forcemergeSegments: string | null }
  | { kind: 'delete'; forcemergeSegments: string | null }
  | { kind: 'convertToLookup'; forcemergeSegments: string | null }
  | { kind: 'extension'; actionIndex: number; forcemergeSegments: string | null };

type ModalAction =
  | { type: 'OPEN'; payload: ModalOpenRequest }
  | { type: 'CLOSE' }
  | { type: 'SET_FORCE_SEGMENTS'; value: string | null };

const initialModalState: ModalState = { kind: 'none', forcemergeSegments: null };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN':
      switch (action.payload.kind) {
        case 'forcemerge':
          return { kind: 'forcemerge', forcemergeSegments: null };
        case 'delete':
          return { kind: 'delete', forcemergeSegments: null };
        case 'convertToLookup':
          return { kind: 'convertToLookup', forcemergeSegments: null };
        case 'extension':
          return {
            kind: 'extension',
            actionIndex: action.payload.actionIndex,
            forcemergeSegments: null,
          };
      }
    case 'CLOSE':
      return { kind: 'none', forcemergeSegments: null };
    case 'SET_FORCE_SEGMENTS':
      return { ...state, forcemergeSegments: action.value } as ModalState;
    default:
      return state;
  }
}

export interface ModalHostHandles {
  openModal: (req: ModalOpenRequest) => void;
  closeModal: () => void;
}

export interface ModalHostProps {
  indexNames: string[];
  indices: Index[];
  indicesListURLParams: string;
  resetSelection?: () => void;
  forcemergeIndices: (maxNumSegments: string) => Promise<void>;
  deleteIndices: () => Promise<void>;
  reloadIndices: () => void;
  extensionsService: ExtensionsService; // concrete type from services
  getUrlForApp: ApplicationStart['getUrlForApp'];
  application: ApplicationStart;
  http: HttpSetup;
}

export const ModalHost = memo(
  forwardRef<ModalHostHandles, ModalHostProps>(function ModalHost(
    {
      indexNames,
      indices,
      indicesListURLParams,
      resetSelection,
      forcemergeIndices,
      deleteIndices,
      reloadIndices,
      extensionsService,
      getUrlForApp,
      application,
      http,
    },
    ref
  ) {
    const [state, dispatch] = useReducer(modalReducer, initialModalState);

    useImperativeHandle(ref, () => ({
      openModal: (req: ModalOpenRequest) => dispatch({ type: 'OPEN', payload: req }),
      closeModal: () => dispatch({ type: 'CLOSE' }),
    }));

    const closeConfirmModal = () => {
      dispatch({ type: 'CLOSE' });
      resetSelection?.();
    };

    const forcemergeSegmentsError = () => {
      const value = state.forcemergeSegments;
      if (!value || value.match(/^([1-9][0-9]*)?$/)) {
        return;
      }
      return i18n.translate('xpack.idxMgmt.indexActionsMenu.segmentsNumberErrorMessage', {
        defaultMessage: 'The number of segments must be greater than zero.',
      });
    };

    const renderForcemergeSegmentsModal = () => {
      const helpText = i18n.translate(
        'xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeSegmentsHelpText',
        {
          defaultMessage:
            'Merge the segments in an index until the number is reduced to this or fewer segments. The default is 1.',
        }
      );
      const selectedIndexCount = indexNames.length;
      const confirmModalTitleId = htmlIdGenerator()('confirmModalTitle');

      return (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          title={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.modalTitle',
            {
              defaultMessage: 'Force merge',
            }
          )}
          titleProps={{ id: confirmModalTitleId }}
          onCancel={closeConfirmModal}
          onConfirm={() => {
            const error = forcemergeSegmentsError();
            if (!error) {
              const value =
                state.forcemergeSegments && state.forcemergeSegments.trim() !== ''
                  ? state.forcemergeSegments
                  : '1';
              forcemergeIndices(value);
              dispatch({ type: 'CLOSE' });
              resetSelection?.();
            }
          }}
          cancelButtonText={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.cancelButtonText',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.confirmButtonText',
            {
              defaultMessage: 'Force merge',
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeDescription"
              defaultMessage="You are about to force merge {selectedIndexCount, plural, one {this index} other {these indices} }:"
              values={{ selectedIndexCount }}
            />
          </p>

          <ul>
            {indexNames.map((indexName) => (
              <li key={indexName}>{indexName}</li>
            ))}
          </ul>

          <EuiCallOut
            title={i18n.translate(
              'xpack.idxMgmt.indexActionsMenu.forceMerge.proceedWithCautionCallOutTitle',
              {
                defaultMessage: 'Proceed with caution!',
              }
            )}
            color="warning"
            iconType="question"
          >
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.indexActionsMenu.forceMerge.forceMergeWarningDescription"
                defaultMessage="
                  Don't force-merge indices to which you're still writing, or to which you'll write
                  again in the future. Instead, rely on the automatic background merge process to
                  perform merges as needed to keep the index running smoothly. If you write to
                  a force-merged index then its performance may become much worse.
                "
              />
            </p>
          </EuiCallOut>

          <EuiSpacer size="m" />

          <EuiForm isInvalid={!!forcemergeSegmentsError()} error={forcemergeSegmentsError()}>
            <EuiFormRow
              label={i18n.translate(
                'xpack.idxMgmt.indexActionsMenu.forceMerge.maximumNumberOfSegmentsFormRowLabel',
                {
                  defaultMessage: 'Maximum number of segments per shard',
                }
              )}
              helpText={helpText}
            >
              <EuiFieldNumber
                data-test-subj="indexActionsForcemergeNumSegments"
                onChange={(event) => {
                  dispatch({ type: 'SET_FORCE_SEGMENTS', value: event.target.value });
                }}
                min={1}
                name="maxNumberSegments"
              />
            </EuiFormRow>
          </EuiForm>
        </EuiConfirmModal>
      );
    };

    const renderConfirmDeleteModal = () => {
      const selectedIndexCount = indexNames.length;
      const confirmModalTitleId = htmlIdGenerator()('confirmModalTitle');

      const standardIndexModalBody = (
        <Fragment>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteDescription"
              defaultMessage="You are about to delete {selectedIndexCount, plural, one {this index} other {these indices} }:"
              values={{ selectedIndexCount }}
            />
          </p>

          <ul>
            {indexNames.map((indexName) => (
              <li key={indexName}>{indexName}</li>
            ))}
          </ul>

          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteWarningDescription"
              defaultMessage="You can't recover a deleted index. Make sure you have appropriate backups. Deleting an index currently being reindexed will stop the reindex operation."
            />
          </p>
        </Fragment>
      );

      return (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          title={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.modalTitle',
            {
              defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {# indices} }',
              values: { selectedIndexCount },
            }
          )}
          titleProps={{ id: confirmModalTitleId }}
          onCancel={() => {
            closeConfirmModal();
          }}
          onConfirm={() => {
            deleteIndices();
            closeConfirmModal();
          }}
          buttonColor="danger"
          confirmButtonDisabled={false}
          cancelButtonText={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.cancelButtonText',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.confirmButtonText',
            {
              defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {indices} }',
              values: { selectedIndexCount },
            }
          )}
        >
          {standardIndexModalBody}
        </EuiConfirmModal>
      );
    };

    const renderConvertToLookupIndexModal = () => {
      const sourceIndexName = indexNames[0];

      return (
        <ConvertToLookupIndexModalContainer
          onCloseModal={() => closeConfirmModal()}
          onSuccess={(lookupIndexName) => {
            navigateToIndexDetailsPage(
              lookupIndexName,
              indicesListURLParams,
              extensionsService,
              application,
              http,
              IndexDetailsSection.Overview
            );

            notificationService.showSuccessToast(
              i18n.translate('xpack.idxMgmt.convertToLookupIndexAction.indexConvertedToastTitle', {
                defaultMessage: 'Index successfully converted to lookup mode',
              }),
              i18n.translate(
                'xpack.idxMgmt.convertToLookupIndexAction.indexConvertedToastMessage',
                {
                  defaultMessage: 'The {lookupIndexName} lookup index has been created.',
                  values: { lookupIndexName },
                }
              )
            );
          }}
          sourceIndexName={sourceIndexName}
        />
      );
    };

    const renderExtensionModal = () => {
      if (state.kind !== 'extension') return null;
      const actionFactory = extensionsService.actions[state.actionIndex];
      if (!actionFactory) return null;
      const actionDef = actionFactory({ indices, reloadIndices, getUrlForApp });
      return actionDef?.renderConfirmModal ? actionDef.renderConfirmModal(closeConfirmModal) : null;
    };

    if (state.kind === 'forcemerge') return <>{renderForcemergeSegmentsModal()}</>;
    if (state.kind === 'delete') return <>{renderConfirmDeleteModal()}</>;
    if (state.kind === 'convertToLookup') return <>{renderConvertToLookupIndexModal()}</>;
    if (state.kind === 'extension') return <>{renderExtensionModal()}</>;
    return null;
  })
);
