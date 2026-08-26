/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Latest lab: extras injected into the "Inventory" side panel (the entity-centric
 * panel renamed to "Inventory" in Latest mode). Rendered via the chrome side
 * nav's extension slots, exactly like the super-short-term integrations panel:
 *
 *   - Header (top, via `sidePanelHeader` / `__kbnSideNavPanelHeader__`): a search
 *     box that filters both the "Saved views" list and the category items. It
 *     writes to the shared nav-search store (`setIntegrationsSearch`), which the
 *     Observability nav tree reads to rebuild the filtered panel — the same
 *     store super-short-term uses, safe to share since the lab modes are
 *     mutually exclusive.
 *   - Section action (a "Manage saved views" cog on the "Saved views" section
 *     header, via `getSectionAction` / `__kbnSideNavSectionAction__`): opens a
 *     modal to rename / delete saved views.
 *
 * Everything here self-gates on `labMode === 'latest'`, so no other mode is
 * affected. The actual slot registration is coordinated in `nav_footer.tsx`
 * (the global slot keys are single-valued, so one registration composes both
 * the super-short-term and Latest renderers).
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import { setIntegrationsSearch, useIntegrationsSearch } from '@kbn/entity-centric-lab-flyout';
import type { SavedView } from './use_saved_views';
import { useSavedViews } from './use_saved_views';

const LAB_MODE_SETTING = 'discover:labMode';
// `latest` and its `elasticOn` clone both light up the Latest-only Inventory
// extras; treat them identically here.
const LATEST_MODES = ['latest', 'elasticOn'];
// Cap matching the Save / SavedViewsBar rename inputs.
const MAX_VIEW_NAME_LENGTH = 50;

const useLabModeIsLatest = (coreStart: CoreStart): boolean => {
  const labMode = useObservable(
    coreStart.uiSettings.get$<string>(LAB_MODE_SETTING, 'off'),
    coreStart.uiSettings.get<string>(LAB_MODE_SETTING, 'off')
  );
  return LATEST_MODES.includes(labMode);
};

// The "default view" affordance is ElasticOn-only (see all_entities_view).
const useLabModeIsElasticOn = (coreStart: CoreStart): boolean => {
  const labMode = useObservable(
    coreStart.uiSettings.get$<string>(LAB_MODE_SETTING, 'off'),
    coreStart.uiSettings.get<string>(LAB_MODE_SETTING, 'off')
  );
  return labMode === 'elasticOn';
};

/**
 * Search box at the top of the "Inventory" panel (Latest only). Mirrors the
 * super-short-term header search: writes to the shared nav-search store so the
 * Observability nav tree can filter the panel's contents.
 */
export const LatestInventoryNavHeader = ({ coreStart }: { coreStart: CoreStart }) => {
  const { euiTheme } = useEuiTheme();
  const isLatest = useLabModeIsLatest(coreStart);
  const query = useIntegrationsSearch();

  if (!isLatest) return null;

  const wrapperStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m} 0;
  `;

  // The panel wraps its content in a roving-tabindex keydown handler that
  // hijacks Arrow/Home/End to move between nav links; stop propagation here so
  // those keys behave normally inside the search box.
  return (
    <div css={wrapperStyles} onKeyDown={(event) => event.stopPropagation()}>
      <EuiFieldSearch
        compressed
        fullWidth
        incremental
        value={query}
        placeholder={i18n.translate(
          'xpack.streams.entityCentricLab.savedViews.nav.searchPlaceholder',
          {
            defaultMessage: 'Search',
          }
        )}
        onChange={(event) => setIntegrationsSearch(event.target.value)}
        aria-label={i18n.translate(
          'xpack.streams.entityCentricLab.savedViews.nav.searchAriaLabel',
          {
            defaultMessage: 'Search saved views and categories',
          }
        )}
        data-test-subj="entityCentricLabInventoryNavSearch"
      />
    </div>
  );
};

/**
 * The "manage saved views" cog, rendered right-aligned on the "Saved views"
 * section header via the chrome side nav's `getSectionAction` slot. Opens a
 * modal listing every saved view with rename / delete. Latest-only.
 */
export const SavedViewsSectionAction = ({ coreStart }: { coreStart: CoreStart }) => {
  const isLatest = useLabModeIsLatest(coreStart);
  const isElasticOn = useLabModeIsElasticOn(coreStart);
  const [isManageOpen, setIsManageOpen] = useState(false);

  if (!isLatest) return null;

  const manageLabel = i18n.translate('xpack.streams.entityCentricLab.savedViews.nav.manage', {
    defaultMessage: 'Manage saved views',
  });

  return (
    <>
      <EuiToolTip content={manageLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="gear"
          color="text"
          size="xs"
          aria-label={manageLabel}
          onClick={() => setIsManageOpen(true)}
          data-test-subj="entityCentricLabManageSavedViewsButton"
        />
      </EuiToolTip>
      {isManageOpen ? (
        <ManageSavedViewsModal onClose={() => setIsManageOpen(false)} showDefault={isElasticOn} />
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// Manage modal
// ---------------------------------------------------------------------------

const listCss = css`
  min-width: 360px;
`;

const rowLabelCss = css`
  min-width: 0;
`;

const ManageSavedViewsModal = ({
  onClose,
  showDefault = false,
}: {
  onClose: () => void;
  showDefault?: boolean;
}) => {
  const { views, renameView, deleteView, defaultViewId, setDefaultView } = useSavedViews();

  const [renameTarget, setRenameTarget] = useState<SavedView | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SavedView | null>(null);

  const modalTitleId = useGeneratedHtmlId({ prefix: 'entityCentricLabManageSavedViewsTitle' });
  const renameModalTitleId = useGeneratedHtmlId({ prefix: 'entityCentricLabRenameSavedViewTitle' });

  const openRename = useCallback((view: SavedView) => {
    setRenameTarget(view);
    setRenameValue(view.name);
  }, []);

  const handleRename = useCallback(() => {
    if (!renameTarget) return;
    const name = renameValue.trim().slice(0, MAX_VIEW_NAME_LENGTH);
    if (!name) return;
    renameView(renameTarget.id, name);
    setRenameTarget(null);
  }, [renameTarget, renameValue, renameView]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteView(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteView]);

  return (
    <>
      <EuiModal
        onClose={onClose}
        aria-labelledby={modalTitleId}
        maxWidth={480}
        data-test-subj="entityCentricLabManageSavedViewsModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.translate('xpack.streams.entityCentricLab.savedViews.manageModal.title', {
              defaultMessage: 'Manage saved views',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {views.length === 0 ? (
            <EuiEmptyPrompt
              paddingSize="s"
              titleSize="xs"
              iconType="save"
              title={
                <h4>
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.savedViews.manageModal.emptyTitle',
                    {
                      defaultMessage: 'No saved views yet',
                    }
                  )}
                </h4>
              }
              body={
                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.savedViews.manageModal.emptyBody',
                    {
                      defaultMessage:
                        'Apply some filters on the inventory, then use "Save view" to bookmark it here.',
                    }
                  )}
                </EuiText>
              }
            />
          ) : (
            <EuiListGroup gutterSize="none" flush maxWidth={false} css={listCss}>
              {views.map((view) => (
                <EuiFlexGroup
                  key={view.id}
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                  data-test-subj={`entityCentricLabManageSavedViewRow-${view.id}`}
                >
                  <EuiFlexItem css={rowLabelCss}>
                    <EuiListGroupItem label={view.name} size="s" showToolTip wrapText />
                  </EuiFlexItem>
                  {showDefault ? (
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={
                          view.id === defaultViewId
                            ? i18n.translate(
                                'xpack.streams.entityCentricLab.savedViews.manageModal.clearDefault',
                                { defaultMessage: 'Remove as default' }
                              )
                            : i18n.translate(
                                'xpack.streams.entityCentricLab.savedViews.manageModal.setDefault',
                                { defaultMessage: 'Set as default' }
                              )
                        }
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          iconType={view.id === defaultViewId ? 'starFilled' : 'starEmpty'}
                          color={view.id === defaultViewId ? 'warning' : 'text'}
                          size="xs"
                          aria-label={
                            view.id === defaultViewId
                              ? i18n.translate(
                                  'xpack.streams.entityCentricLab.savedViews.manageModal.clearDefaultAria',
                                  {
                                    defaultMessage: 'Remove {name} as default',
                                    values: { name: view.name },
                                  }
                                )
                              : i18n.translate(
                                  'xpack.streams.entityCentricLab.savedViews.manageModal.setDefaultAria',
                                  {
                                    defaultMessage: 'Set {name} as default',
                                    values: { name: view.name },
                                  }
                                )
                          }
                          onClick={() => setDefaultView(view.id === defaultViewId ? null : view.id)}
                          data-test-subj={`entityCentricLabManageSavedViewDefault-${view.id}`}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.streams.entityCentricLab.savedViews.manageModal.rename',
                        { defaultMessage: 'Rename' }
                      )}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        iconType="pencil"
                        color="text"
                        size="xs"
                        aria-label={i18n.translate(
                          'xpack.streams.entityCentricLab.savedViews.manageModal.renameAria',
                          { defaultMessage: 'Rename {name}', values: { name: view.name } }
                        )}
                        onClick={() => openRename(view)}
                        data-test-subj={`entityCentricLabManageSavedViewRename-${view.id}`}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.streams.entityCentricLab.savedViews.manageModal.delete',
                        { defaultMessage: 'Delete' }
                      )}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        size="xs"
                        aria-label={i18n.translate(
                          'xpack.streams.entityCentricLab.savedViews.manageModal.deleteAria',
                          { defaultMessage: 'Delete {name}', values: { name: view.name } }
                        )}
                        onClick={() => setDeleteTarget(view)}
                        data-test-subj={`entityCentricLabManageSavedViewDelete-${view.id}`}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ))}
            </EuiListGroup>
          )}
        </EuiModalBody>
      </EuiModal>

      {renameTarget ? (
        <EuiModal
          onClose={() => setRenameTarget(null)}
          aria-labelledby={renameModalTitleId}
          maxWidth={420}
          data-test-subj="entityCentricLabManageSavedViewsRenameModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={renameModalTitleId}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.manageModal.renameTitle', {
                defaultMessage: 'Rename view',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.entityCentricLab.savedViews.manageModal.nameLabel',
                { defaultMessage: 'View name' }
              )}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                autoFocus
                maxLength={MAX_VIEW_NAME_LENGTH}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleRename();
                }}
                data-test-subj="entityCentricLabManageSavedViewsRenameInput"
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => setRenameTarget(null)}>
              {i18n.translate('xpack.streams.entityCentricLab.savedViews.manageModal.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={handleRename}
              isDisabled={!renameValue.trim() || renameValue.trim() === renameTarget.name}
              data-test-subj="entityCentricLabManageSavedViewsRenameConfirm"
            >
              {i18n.translate(
                'xpack.streams.entityCentricLab.savedViews.manageModal.renameConfirm',
                {
                  defaultMessage: 'Rename',
                }
              )}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}

      {deleteTarget ? (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.streams.entityCentricLab.savedViews.manageModal.deleteTitle',
            {
              defaultMessage: 'Delete "{name}"?',
              values: { name: deleteTarget.name },
            }
          )}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          cancelButtonText={i18n.translate(
            'xpack.streams.entityCentricLab.savedViews.manageModal.deleteCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.entityCentricLab.savedViews.manageModal.deleteConfirm',
            { defaultMessage: 'Delete view' }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="entityCentricLabManageSavedViewsDeleteModal"
        >
          <p>
            {i18n.translate('xpack.streams.entityCentricLab.savedViews.manageModal.deleteBody', {
              defaultMessage: 'This action cannot be undone.',
            })}
          </p>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
