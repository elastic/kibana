/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { shade, useEuiScrollBar, useEuiTheme } from '@elastic/eui';
import { SidebarContent } from './sidebar_content';

interface Props {
  commit: Function;
}

export const Sidebar: FunctionComponent<Props> = ({ commit }) => {
  const { euiTheme } = useEuiTheme();
  const scrollBar = useEuiScrollBar();
  const styles = useMemo(
    () => css`
      ${scrollBar}

      & .canvasSidebar__elementButtons {
        background: ${shade(euiTheme.colors.lightestShade, 0.05)};
      }

      & .canvasSidebar__panel {
        border-bottom: ${euiTheme.border.thin};
      }

      & .canvasSidebar__accordion {
        background: ${euiTheme.colors.lightestShade};

        &.euiAccordion-isOpen {
          background: transparent;
        }

        &:before,
        &:after {
          background: ${euiTheme.colors.lightShade};
        }
      }
    `,
    [euiTheme, scrollBar]
  );

  return (
    <div className="canvasSidebar" css={styles}>
      <SidebarContent commit={commit} />
    </div>
  );
};
