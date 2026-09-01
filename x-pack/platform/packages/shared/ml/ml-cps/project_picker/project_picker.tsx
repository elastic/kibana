/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps, useCallback, type FC, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import { ProjectPicker, DisabledProjectPicker } from '@kbn/cps-utils';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export interface MlProjectPickerPanelProps
  extends Pick<
    ComponentProps<typeof ProjectPicker>,
    'onProjectRoutingChange' | 'defaultProjectRoutingGetter' | 'fetchProjectsByRouting'
  > {
  projectRouting?: ProjectRouting;
  totalProjectCount: number;
  isReadonly?: boolean;
  disabled?: boolean;
  displayDisabledTooltip?: boolean;
  projectRoutingValueTestSubj?: string;
}

export const MlProjectPickerPanel: FC<MlProjectPickerPanelProps> = ({
  projectRouting,
  onProjectRoutingChange,
  totalProjectCount,
  isReadonly = false,
  disabled = false,
  displayDisabledTooltip = true,
  projectRoutingValueTestSubj,
  defaultProjectRoutingGetter,
  fetchProjectsByRouting,
}) => {
  const currentProjectRouting = useRef(projectRouting);
  currentProjectRouting.current = projectRouting;

  const isDisabled = disabled || currentProjectRouting.current === undefined;

  const currentProjectRoutingGetter = useCallback(() => {
    return currentProjectRouting.current;
  }, []);

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
              fetchProjectsByRouting={fetchProjectsByRouting}
              totalProjectCount={totalProjectCount}
              currentProjectRoutingGetter={currentProjectRoutingGetter}
              defaultProjectRoutingGetter={defaultProjectRoutingGetter}
              onProjectRoutingChange={onProjectRoutingChange}
              isReadonly={isReadonly}
              isDisabled={disabled}
              projectRoutingStrategy="snapshot"
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
