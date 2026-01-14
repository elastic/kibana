/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiFormRow, EuiTitle } from '@elastic/eui';
import { type FC, useCallback } from 'react';
import React from 'react';

import type { CPSPluginStart } from '@kbn/cps/public';
import { ProjectPickerContent } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { CustomizeSpaceFormValues } from '../../types';
import { SectionPanel } from '../section_panel';

interface Props {
  space: CustomizeSpaceFormValues;
  editingExistingSpace: boolean;
  onChange: (space: CustomizeSpaceFormValues) => void;
  title?: string;
}

interface KibanaServices {
  cps?: CPSPluginStart;
}

export const CustomizeCps: FC<Props> = ({ space, title, onChange }) => {
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

  const canEdit = () => {
    return application?.capabilities?.management?.kibana.manage_project_routing ?? false;
  };

  return (
    <SectionPanel title={title} dataTestSubj="cpsDefaultScopePanel">
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.spaces.management.manageSpacePage.cpsDefaultScopeTitle"
                defaultMessage="Cross-project search"
              />
            </h3>
          </EuiTitle>
        }
        description={i18n.translate(
          'xpack.spaces.management.manageSpacePage.cpsDefaultScopeDescription',
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
        >
          <ProjectPickerContent
            projectRouting={space.projectRouting}
            onProjectRoutingChange={updateProjectRouting}
            fetchProjects={fetchProjects}
            isReadonly={!canEdit()}
            showTitle={false}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </SectionPanel>
  );
};
