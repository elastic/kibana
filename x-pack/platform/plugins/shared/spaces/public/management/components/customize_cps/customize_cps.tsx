/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiPanel,
  EuiTitle,
  EuiToolTip,
  EuiWrappingPopover,
} from '@elastic/eui';
import { type FC, useCallback, useMemo, useRef, useState } from 'react';
import React from 'react';

import type { CPSPluginStart } from '@kbn/cps/public';
import { type HeaderContextMenuItemProps, ProjectPickerContent } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { CustomizeSpaceFormValues } from '../../types';
import { SectionPanel } from '../section_panel';

interface Props {
  space: CustomizeSpaceFormValues;
  onChange: (space: CustomizeSpaceFormValues) => void;
}

interface KibanaServices {
  cps?: CPSPluginStart;
}

export const CustomizeCps: FC<Props> = ({ space, onChange }) => {
  const {
    services: { cps, application },
  } = useKibana<KibanaServices>();

  const contextMenuTriggerButtonRef = useRef<HTMLButtonElement>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const openContextMenu = useCallback(() => {
    setIsContextMenuOpen(true);
  }, []);

  const closeContextMenu = useCallback(() => {
    setIsContextMenuOpen(false);
  }, []);

  const fetchProjects = useCallback(
    (projectRouting?: ProjectRouting) => {
      return cps?.cpsManager?.fetchProjects(projectRouting) ?? Promise.resolve(null);
    },
    [cps?.cpsManager]
  );

  const updateProjectRouting = useCallback(
    (newRouting: ProjectRouting) => {
      onChange({
        ...space,
        projectRouting: newRouting,
      });
    },
    [onChange, space]
  );

  const canEdit = useCallback(
    () => application?.capabilities?.project_routing?.manage_space_default === true,
    [application?.capabilities?.project_routing?.manage_space_default]
  );

  const configurationLinks = useMemo(
    () =>
      [cps?.cpsManager?.getConfigurationLinks()?.manageCrossProjectSearch].filter(
        (item): item is HeaderContextMenuItemProps => Boolean(item)
      ),
    [cps?.cpsManager]
  );

  return (
    <SectionPanel dataTestSubj="cpsDefaultScopePanel">
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.spaces.management.manageSpacePage.customizeCps.cpsDefaultScopeTitle"
                defaultMessage="Cross-project search"
              />
            </h3>
          </EuiTitle>
        }
        description={i18n.translate(
          'xpack.spaces.management.manageSpacePage.customizeCps.cpsDefaultScopeDescription',
          {
            defaultMessage:
              'Cross-project search allows searching across this project and any linked projects. ' +
              'Use this setting to define which projects to search by default when running queries from this space. ',
          }
        )}
        fullWidth
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.spaces.management.manageSpacePage.cpsDefaultScopeLabel', {
            defaultMessage: 'Cross-project search default scope',
          })}
          labelAppend={
            Boolean(configurationLinks.length) ? (
              <EuiToolTip disableScreenReaderOutput>
                <EuiButtonIcon
                  buttonRef={contextMenuTriggerButtonRef}
                  iconType="ellipsis"
                  aria-label={i18n.translate(
                    'xpack.spaces.management.manageSpacePage.cpsDefaultScopeMenuActions',
                    {
                      defaultMessage: 'Cross-project search default scope menu actions',
                    }
                  )}
                  color="text"
                  onClick={openContextMenu}
                  data-test-subj="cpsDefaultScopeMenuActionsButton"
                />
              </EuiToolTip>
            ) : null
          }
        >
          <>
            {contextMenuTriggerButtonRef.current && (
              <EuiWrappingPopover
                button={contextMenuTriggerButtonRef.current}
                aria-label={i18n.translate(
                  'xpack.spaces.management.manageSpacePage.cpsDefaultScopeMenuActions',
                  {
                    defaultMessage: 'Cross-project search default scope menu actions',
                  }
                )}
                anchorPosition="downRight"
                isOpen={isContextMenuOpen}
                closePopover={closeContextMenu}
                panelPaddingSize="none"
              >
                <EuiContextMenuPanel
                  items={configurationLinks?.map((item) => (
                    <EuiContextMenuItem
                      key={item.label}
                      icon={item.icon}
                      href={item.href}
                      external={item.external}
                      data-test-subj={item.testSubj}
                      onClick={closeContextMenu}
                    >
                      {item.label}
                    </EuiContextMenuItem>
                  ))}
                />
              </EuiWrappingPopover>
            )}
            <EuiPanel paddingSize="none" hasShadow={false} hasBorder>
              <ProjectPickerContent
                showHeader={false}
                projectRouting={space.projectRouting}
                onProjectRoutingChange={updateProjectRouting}
                fetchProjectsByRouting={fetchProjects}
                controlsState={canEdit() ? 'enabled' : 'disabled'}
              />
            </EuiPanel>
          </>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </SectionPanel>
  );
};
