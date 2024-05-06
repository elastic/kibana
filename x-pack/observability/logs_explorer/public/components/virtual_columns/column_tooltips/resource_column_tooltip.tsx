/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import type { CustomGridColumnProps } from '@kbn/unified-data-table';
import { euiThemeVars } from '@kbn/ui-theme';
import { resourceHeaderTooltipParagraph, resourceLabel } from '../../common/translations';
import { HoverPopover } from '../../common/hover_popover';
import { TooltipButtonComponent } from './tooltip_button';
import * as constants from '../../../../common/constants';
import { FieldWithToken } from './field_with_token';

const spacingCSS = css`
  margin-bottom: ${euiThemeVars.euiSizeS};
`;

export const ResourceColumnTooltip = ({ column, headerRowHeight }: CustomGridColumnProps) => {
  return (
    <HoverPopover
      button={
        <TooltipButtonComponent
          displayText={column.displayAsText}
          headerRowHeight={headerRowHeight}
        />
      }
      title={resourceLabel}
    >
      <div style={{ width: '230px' }}>
        <EuiText size="s" css={spacingCSS}>
          <p>{resourceHeaderTooltipParagraph}</p>
        </EuiText>
        {[
          constants.SERVICE_NAME_FIELD,
          constants.CONTAINER_NAME_FIELD,
          constants.ORCHESTRATOR_NAMESPACE_FIELD,
          constants.HOST_NAME_FIELD,
          constants.CLOUD_INSTANCE_ID_FIELD,
        ].map((field) => (
          <FieldWithToken field={field} key={field} />
        ))}
      </div>
    </HoverPopover>
  );
};
