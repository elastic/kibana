/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';
import { type FC, useCallback, useState } from 'react';
import React from 'react';

import type { CPSPluginStart } from '@kbn/cps/public';
import { ProjectPickerContent } from '@kbn/cps-utils';
import { strings } from '@kbn/cps-utils/components/strings';
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

  const fetchProjects = useCallback(() => {
    return cps?.cpsManager?.fetchProjects() ?? Promise.resolve(null);
  }, [cps?.cpsManager]);

  const updateProjectRouting = (newRouting: ProjectRouting) => {
    onChange({
      ...space,
      projectRouting: newRouting,
    });
  };

  const canEdit = (): boolean => {
    return application?.capabilities?.project_routing?.manage_space_default === true;
  };

  const [settingsIsOpen, setSettingsIsOpen] = useState(false);
  const closePopover = () => setSettingsIsOpen(false);

  const settingsButton = () => {
    return (
      <EuiPopover
        data-test-subj="projectPickerSettingsPopover"
        button={
          <EuiButtonIcon
            display="empty"
            iconType="ellipsis"
            aria-label={i18n.translate(
              'xpack.spaces.management.manageSpacePage.customizeCps.settingsButtonLabel',
              {
                defaultMessage: 'Manage cross-project search',
              }
            )}
            onClick={() => setSettingsIsOpen(!settingsIsOpen)}
            size="s"
            color="text"
          />
        }
        isOpen={settingsIsOpen}
        closePopover={closePopover}
        repositionOnScroll
        anchorPosition="rightCenter"
        ownFocus
        panelPaddingSize="none"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={[
            {
              id: 0,
              items: [
                {
                  name: strings.getManageCrossProjectSearchLabel(),
                  icon: 'gear',
                  'data-test-subj': 'spacesManageCpsSettingsMenuItem',
                  onClick: closePopover, // TODO: redirect to CPS management - UI not ready yet
                },
              ],
            },
          ]}
        />
      </EuiPopover>
    );
  };

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
              'Search across this project and any linked projects from a single location with cross-project search. ' +
              'Use these settings to limit the space default scope to a specific subset of projects.',
          }
        )}
        fullWidth
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.spaces.management.manageSpacePage.cpsDefaultScopeLabel', {
            defaultMessage: 'Cross-project search default scope',
          })}
          labelAppend={settingsButton()}
        >
          <EuiPanel paddingSize="none" hasShadow={false} hasBorder>
            <ProjectPickerContent
              projectRouting={space.projectRouting}
              onProjectRoutingChange={updateProjectRouting}
              fetchProjects={fetchProjects}
              isReadonly={!canEdit()}
            />
          </EuiPanel>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </SectionPanel>
  );
};
