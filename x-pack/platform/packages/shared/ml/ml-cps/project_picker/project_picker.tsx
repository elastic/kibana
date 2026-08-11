/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps, useCallback, type FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import { ProjectPicker, DisabledProjectPicker } from '@kbn/cps-utils';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EMPTY, type BehaviorSubject } from 'rxjs';
import { useObservable } from '@kbn/use-observable';

export interface MlProjectPickerPanelProps
  extends Pick<
    ComponentProps<typeof ProjectPicker>,
    | 'onProjectRoutingChange'
    | 'getActiveRouteProjects$'
    | 'defaultProjectRoutingGetter'
    | 'fetchProjectsByRouting'
  > {
  projectRouting$?: BehaviorSubject<ProjectRouting>;
  totalProjectCount: number;
  isReadonly?: boolean;
  disabled?: boolean;
  displayDisabledTooltip?: boolean;
  projectRoutingValueTestSubj?: string;
}

export const MlProjectPickerPanel: FC<MlProjectPickerPanelProps> = ({
  projectRouting$,
  onProjectRoutingChange,
  totalProjectCount,
  isReadonly = false,
  disabled = false,
  displayDisabledTooltip = true,
  projectRoutingValueTestSubj,
  getActiveRouteProjects$,
  defaultProjectRoutingGetter,
  fetchProjectsByRouting,
}) => {
  const isDisabled = disabled || projectRouting$ === undefined;

  const currentProjectRoutingGetter = useCallback(() => {
    return projectRouting$?.value;
  }, [projectRouting$]);

  const projectRouting = useObservable(
    projectRouting$?.asObservable() ?? EMPTY,
    defaultProjectRoutingGetter()
  );

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={true}
      grow={false}
      paddingSize="xs"
      css={{ display: 'inline-block', paddingRight: '12px' }}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {isDisabled ? (
            <DisabledProjectPicker
              totalProjectCount={totalProjectCount}
              customTooltipContent={
                displayDisabledTooltip
                  ? i18n.translate('xpack.ml.projectPicker.disabledTooltip', {
                      defaultMessage: 'Cross-project search selection currently not available.',
                    })
                  : undefined
              }
            />
          ) : (
            <ProjectPicker
              getActiveRouteProjects$={getActiveRouteProjects$}
              fetchProjectsByRouting={fetchProjectsByRouting}
              totalProjectCount={totalProjectCount}
              currentProjectRoutingGetter={currentProjectRoutingGetter}
              defaultProjectRoutingGetter={defaultProjectRoutingGetter}
              onProjectRoutingChange={onProjectRoutingChange}
              isReadonly={isReadonly}
              isDisabled={disabled}
            />
          )}
        </EuiFlexItem>
        {projectRouting ? (
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              color="subdued"
              data-test-subj={projectRoutingValueTestSubj}
              css={css`
                word-break: break-word;
              `}
            >
              {projectRouting}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
