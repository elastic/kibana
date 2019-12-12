/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../components/detection_engine/utility_bar';
import * as i18n from '../../translations';

export const OpenSignals = React.memo<{ totalCount: number }>(({ totalCount }) => {
  return (
    <>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{`${i18n.PANEL_SUBTITLE_SHOWING}: ${totalCount} signals`}</UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup>
            <UtilityBarText>{'Selected: 20 signals'}</UtilityBarText>

            <UtilityBarAction
              iconSide="right"
              iconType="arrowDown"
              popoverContent={() => <p>{'Batch actions context menu here.'}</p>}
            >
              {'Batch actions'}
            </UtilityBarAction>

            <UtilityBarAction iconType="listAdd">
              {'Select all signals on all pages'}
            </UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Michael: Open signals datagrid here. Talk to Chandler Prall about possibility of early access. If not possible, use basic table. */}
    </>
  );
});
