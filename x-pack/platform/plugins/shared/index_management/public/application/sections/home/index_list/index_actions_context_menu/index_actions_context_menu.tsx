/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { every } from 'lodash';
import type { EuiPopoverProps, EuiButtonProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiContextMenu,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiConfirmModal,
  htmlIdGenerator,
  EuiText,
} from '@elastic/eui';

import type { HttpSetup } from '@kbn/core-http-browser';
import { ConvertToLookupIndexModalContainer } from '../details_page/convert_to_lookup_index_modal/convert_to_lookup_index_modal_container';
import { flattenPanelTree } from '../../../../lib/flatten_panel_tree';
import {
  INDEX_OPEN,
  IndexDetailsSection,
  MAX_DOCUMENTS_FOR_CONVERT_TO_LOOKUP_INDEX,
  MAX_SHARDS_FOR_CONVERT_TO_LOOKUP_INDEX,
} from '../../../../../../common/constants';
import { getIndexDetailsLink, navigateToIndexDetailsPage } from '../../../../services/routing';
import { notificationService } from '../../../../services/notification';
import { useAppContext } from '../../../../app_context';
import type { Index } from '../../../../../../common';

export interface IndexActionsContextMenuProps {
  // either an array of indices selected in the list view or an array of 1 index name on the details panel/page
  indexNames: string[];
  // indices data
  indices: Index[];

  // indicates if the context menu is on the list view (to show additional actions)
  isOnListView?: boolean;
  // a callback used to reset selected indices on the list view
  resetSelection?: () => void;

  // these props are only set on the details panel to change style
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  iconSide?: EuiButtonProps['iconSide'];
  iconType?: EuiButtonProps['iconType'];
  label?: ReactNode;

  // index actions: functions are called with indexNames prop so no need to pass it as argument here
  closeIndices: () => Promise<void>;
  openIndices: () => Promise<void>;
  flushIndices: () => Promise<void>;
  refreshIndices: () => Promise<void>;
  clearCacheIndices: () => Promise<void>;
  forcemergeIndices: (maxNumSegments: string) => Promise<void>;
  deleteIndices: () => Promise<void>;

  // used to determine if all indices are open
  indexStatusByName: {
    [indexName: string]: Index['status'] | undefined;
  };

  // this function is called with an extension service action
  performExtensionAction: (
    requestMethod: (indexNames: string[], http: HttpSetup) => Promise<void>,
    successMessage: string
  ) => Promise<void>;
  // this function is called to "refresh" the indices data after and extension service action that uses a modal
  reloadIndices: () => void;

  /**
   * Props added to use the context menu on the new index details page
   */
  // makes the button secondary
  fill?: boolean;
  // sets the button's loading state
  isLoading?: boolean;
  indicesListURLParams?: string;
}

export const IndexActionsContextMenu = ({
  indexNames,
  indices,
  isOnListView,
  resetSelection,
  anchorPosition = 'rightUp',
  iconSide = 'right',
  iconType = 'arrowDown',
  label,
  closeIndices,
  openIndices,
  flushIndices,
  refreshIndices,
  clearCacheIndices,
  forcemergeIndices,
  deleteIndices,
  indexStatusByName,
  performExtensionAction,
  reloadIndices,
  fill = true,
  isLoading = false,
  indicesListURLParams = '',
}: IndexActionsContextMenuProps) => {
  const {
    services: { extensionsService },
    plugins: { reindexService },
    core: { getUrlForApp, application, http },
    history,
    config: { enableIndexActions },
  } = useAppContext();

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [renderConfirmModal, setRenderConfirmModal] = useState<((props: any) => ReactNode) | null>(
    null
  );
  const [forcemergeSegments, setForcemergeSegments] = useState<string | null>(null);

  const closeConfirmModal = () => {
    setRenderConfirmModal(null);
    resetSelection?.();
  };

  const onButtonClick = () => {
    setIsPopoverOpen((prevState) => !prevState);
  };

  const closePopoverAndExecute = (func: () => void) => {
    setIsPopoverOpen(false);
    setRenderConfirmModal(null);
    func();
    resetSelection?.();
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const forcemergeSegmentsError = () => {
    if (!forcemergeSegments || forcemergeSegments.match(/^([1-9][0-9]*)?$/)) {
      return;
    } else {
      return i18n.translate('xpack.idxMgmt.indexActionsMenu.segmentsNumberErrorMessage', {
        defaultMessage: 'The number of segments must be greater than zero.',
      });
    }
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
        title={i18n.translate('xpack.idxMgmt.indexActionsMenu.forceMerge.confirmModal.modalTitle', {
          defaultMessage: 'Force merge',
        })}
        titleProps={{ id: confirmModalTitleId }}
        onCancel={closeConfirmModal}
        onConfirm={() => {
          if (forcemergeSegments && !forcemergeSegmentsError()) {
            closePopoverAndExecute(() => {
              forcemergeIndices(forcemergeSegments);
              setForcemergeSegments(null);
            });
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
                setForcemergeSegments(event.target.value);
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
        onConfirm={() => closePopoverAndExecute(deleteIndices)}
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
            i18n.translate('xpack.idxMgmt.convertToLookupIndexAction.indexConvertedToastMessage', {
              defaultMessage: 'The {lookupIndexName} lookup index has been created.',
              values: { lookupIndexName },
            })
          );
        }}
        sourceIndexName={sourceIndexName}
      />
    );
  };

  const isConvertableToLookupIndex = (indexName: string) => {
    const selectedIndex = indices.find((index) => index.name === indexName);

    if (
      !selectedIndex ||
      selectedIndex.documents === undefined ||
      selectedIndex.primary === undefined
    ) {
      return false;
    }

    if (
      selectedIndex.documents >= 0 &&
      selectedIndex.documents <= MAX_DOCUMENTS_FOR_CONVERT_TO_LOOKUP_INDEX &&
      Number(selectedIndex.primary) === MAX_SHARDS_FOR_CONVERT_TO_LOOKUP_INDEX
    ) {
      return true;
    }

    return false;
  };

  const getPanels = () => {
    const allOpen = every(indexNames, (indexName) => {
      return indexStatusByName[indexName] === INDEX_OPEN;
    });

    const selectedIndexCount = indexNames.length;
    const items = [];
    if (isOnListView && selectedIndexCount === 1) {
      items.push({
        'data-test-subj': 'showOverviewIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexOverviewLabel', {
          defaultMessage: 'Show index overview',
        }),
        onClick: () => {
          navigateToIndexDetailsPage(
            indexNames[0],
            indicesListURLParams,
            extensionsService,
            application,
            http,
            IndexDetailsSection.Overview
          );
        },
      });
      items.push({
        'data-test-subj': 'showSettingsIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexSettingsLabel', {
          defaultMessage: 'Show index settings',
        }),
        onClick: () => {
          navigateToIndexDetailsPage(
            indexNames[0],
            indicesListURLParams,
            extensionsService,
            application,
            http,
            IndexDetailsSection.Settings
          );
        },
      });
      items.push({
        'data-test-subj': 'showMappingsIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexMappingLabel', {
          defaultMessage: 'Show index mapping',
        }),
        onClick: () => {
          navigateToIndexDetailsPage(
            indexNames[0],
            indicesListURLParams,
            extensionsService,
            application,
            http,
            IndexDetailsSection.Mappings
          );
        },
      });
      if (allOpen && enableIndexActions) {
        items.push({
          'data-test-subj': 'showStatsIndexMenuButton',
          name: i18n.translate('xpack.idxMgmt.indexActionsMenu.showIndexStatsLabel', {
            defaultMessage: 'Show index stats',
          }),
          onClick: () => {
            history.push(
              getIndexDetailsLink(indexNames[0], indicesListURLParams, IndexDetailsSection.Stats)
            );
          },
        });
      }
    }
    if (allOpen && enableIndexActions) {
      items.push({
        'data-test-subj': 'closeIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.closeIndexLabel', {
          defaultMessage: 'Close {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          closePopoverAndExecute(closeIndices);
        },
      });
      items.push({
        'data-test-subj': 'forcemergeIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.forceMergeIndexLabel', {
          defaultMessage: 'Force merge {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          closePopover();
          setRenderConfirmModal(() => renderForcemergeSegmentsModal);
        },
      });
      items.push({
        'data-test-subj': 'refreshIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.refreshIndexLabel', {
          defaultMessage: 'Refresh {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          closePopoverAndExecute(refreshIndices);
        },
      });
      items.push({
        'data-test-subj': 'clearCacheIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.clearIndexCacheLabel', {
          defaultMessage: 'Clear {selectedIndexCount, plural, one {index} other {indices} } cache',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          closePopoverAndExecute(clearCacheIndices);
        },
      });
      items.push({
        'data-test-subj': 'flushIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.flushIndexLabel', {
          defaultMessage: 'Flush {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          closePopoverAndExecute(flushIndices);
        },
      });
    } else if (!allOpen && enableIndexActions) {
      items.push({
        'data-test-subj': 'openIndexMenuButton',
        name: i18n.translate('xpack.idxMgmt.indexActionsMenu.openIndexLabel', {
          defaultMessage: 'Open {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }),
        onClick: () => {
          closePopoverAndExecute(openIndices);
        },
      });
    }
    items.push({
      'data-test-subj': 'deleteIndexMenuButton',
      name: i18n.translate('xpack.idxMgmt.indexActionsMenu.deleteIndexLabel', {
        defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {indices} }',
        values: { selectedIndexCount },
      }),
      onClick: () => {
        closePopover();
        setRenderConfirmModal(() => renderConfirmDeleteModal);
      },
    });
    extensionsService.actions.forEach((actionExtension) => {
      const actionExtensionDefinition = actionExtension({
        indices,
        reloadIndices,
        getUrlForApp,
      });
      if (actionExtensionDefinition) {
        const {
          buttonLabel,
          requestMethod,
          successMessage,
          renderConfirmModal: actionRenderConfirmModal,
        } = actionExtensionDefinition;
        if (requestMethod) {
          items.push({
            name: buttonLabel,
            onClick: () => {
              closePopoverAndExecute(async () => {
                await performExtensionAction(requestMethod, successMessage);
              });
            },
          });
        } else {
          items.push({
            name: buttonLabel,
            onClick: () => {
              closePopover();
              setRenderConfirmModal(() => actionRenderConfirmModal);
            },
          });
        }
      }
    });
    if (selectedIndexCount === 1) {
      const indexName = indexNames[0];
      const isConvertable = isConvertableToLookupIndex(indexName);

      const selectedIndex = indices.find((index) => index.name === indexName);

      // Only show the "Convert to lookup index" action if the reindexService plugin is available,
      // the index is not already a lookup index and the index is not hidden
      if (reindexService && selectedIndex?.mode !== 'lookup' && !selectedIndex?.hidden) {
        items.push({
          'data-test-subj': 'convertToLookupIndexButton',
          name: (
            <>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.idxMgmt.indexActionsMenu.convertToLookupIndexButton"
                  defaultMessage="Convert to lookup index"
                />
              </EuiText>
              {!isConvertable && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs">
                    <FormattedMessage
                      id="xpack.idxMgmt.indexActionsMenu.convertToLookupIndexButton.error"
                      defaultMessage="The index must have less than 2 billion documents and a single shard to be converted."
                    />
                  </EuiText>
                </>
              )}
            </>
          ),
          disabled: !isConvertable,
          onClick: () => {
            closePopover();
            setRenderConfirmModal(() => renderConvertToLookupIndexModal);
          },
        });
      }
    }
    const panelTree = {
      id: 0,
      title: i18n.translate('xpack.idxMgmt.indexActionsMenu.panelTitle', {
        defaultMessage: '{selectedIndexCount, plural, one {Index} other {Indices} } options',
        values: { selectedIndexCount },
      }),
      items,
    };
    return flattenPanelTree(panelTree);
  };

  const selectedIndexCount = indexNames.length;

  const panels = getPanels();

  const button = (
    <EuiButton
      data-test-subj="indexActionsContextMenuButton"
      iconSide={iconSide}
      aria-label={i18n.translate('xpack.idxMgmt.indexActionsMenu.manageButtonAriaLabel', {
        defaultMessage: '{selectedIndexCount, plural, one {index} other {indices} } options',
        values: { selectedIndexCount },
      })}
      onClick={onButtonClick}
      iconType={iconType}
      fill={fill}
      isLoading={isLoading}
    >
      {label ? (
        label
      ) : (
        <FormattedMessage
          id="xpack.idxMgmt.indexActionsMenu.manageButtonLabel"
          defaultMessage="Manage {selectedIndexCount, plural, one {index} other {{selectedIndexCount} indices}}"
          values={{ selectedIndexCount }}
        />
      )}
    </EuiButton>
  );

  return (
    <div>
      {renderConfirmModal ? renderConfirmModal(closeConfirmModal) : null}
      <EuiPopover
        id="contextMenuIndices"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition={anchorPosition}
        repositionOnScroll
      >
        <EuiContextMenu data-test-subj="indexContextMenu" initialPanelId={0} panels={panels} />
      </EuiPopover>
    </div>
  );
};
