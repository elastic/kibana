/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { hasActiveModifierKey } from '@kbn/shared-ux-utility';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  SavedSearchType,
  SavedSearchTypeDisplayName,
  type SavedSearchAttributes,
} from '@kbn/saved-search-plugin/common';
import type { ApplicationStart, IUiSettingsClient } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedObjectFinderProps } from '@kbn/saved-objects-finder-plugin/public';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

export type { SavedObjectFinderProps };

export interface MlOpenSessionFlyoutServices {
  http: {
    basePath: {
      prepend(path: string): string;
    };
  };
  application: Pick<ApplicationStart, 'capabilities'>;
  contentManagement: ContentManagementPublicStart;
  uiSettings: IUiSettingsClient;
}

export interface MlOpenSessionFlyoutProps {
  services: MlOpenSessionFlyoutServices;
  onClose: () => void;
  onOpenSavedSearch: (id: string) => void;
  SavedObjectFinderComponent: ComponentType<SavedObjectFinderProps>;
  /** When true, ES|QL-based sessions are hidden from the list */
  filterEsql?: boolean;
}

export const MlOpenSessionFlyout: FC<MlOpenSessionFlyoutProps> = ({
  services,
  onClose,
  onOpenSavedSearch,
  SavedObjectFinderComponent,
  filterEsql = false,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const { http, application, contentManagement, uiSettings } = services;

  const hasSavedObjectPermission =
    application.capabilities.savedObjectsManagement?.edit ||
    application.capabilities.savedObjectsManagement?.delete;

  return (
    <EuiFlyout
      aria-labelledby={modalTitleId}
      ownFocus
      onClose={onClose}
      data-test-subj="loadSearchForm"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={modalTitleId}>
            <FormattedMessage
              id="xpack.aiops.dataSourcePicker.openSessionFlyout.title"
              defaultMessage="Open Discover session"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinderComponent
          id="mlOpenSession"
          services={{
            savedObjectsTagging: undefined,
            contentClient: contentManagement.client,
            uiSettings,
          }}
          noItemsMessage={
            <FormattedMessage
              id="xpack.aiops.dataSourcePicker.openSessionFlyout.noSessionsFound"
              defaultMessage="No matching Discover sessions found."
            />
          }
          savedObjectMetaData={[
            {
              type: SavedSearchType,
              getIconForSavedObject: () => 'discoverApp',
              name: i18n.translate(
                'xpack.aiops.dataSourcePicker.openSessionFlyout.savedObjectName',
                {
                  defaultMessage: 'Discover session',
                }
              ),
              ...(filterEsql
                ? {
                    showSavedObject: (savedObject: SavedObjectCommon<SavedSearchAttributes>) =>
                      !savedObject.attributes.isTextBasedQuery,
                  }
                : {}),
            },
          ]}
          onChoose={onOpenSavedSearch}
          showFilter
        />
      </EuiFlyoutBody>
      {hasSavedObjectPermission && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiButton
                fill
                onClick={(e: React.MouseEvent) => {
                  if (hasActiveModifierKey(e)) return;
                  onClose();
                }}
                data-test-subj="manageSearchesBtn"
                href={http.basePath.prepend(
                  `/app/management/kibana/objects?initialQuery=type:("${SavedSearchTypeDisplayName}")`
                )}
              >
                <FormattedMessage
                  id="xpack.aiops.dataSourcePicker.openSessionFlyout.manageSessionsButton"
                  defaultMessage="Manage Discover sessions"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
